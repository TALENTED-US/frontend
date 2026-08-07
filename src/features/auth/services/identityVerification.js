import * as PortOne from '@portone/browser-sdk/v2'

const PENDING_VERIFICATION_KEY = 'buttie-pending-identity-verification'
const VERIFICATION_TTL_MS = 10 * 60 * 1000

export const IDENTITY_VERIFICATION_PURPOSE = Object.freeze({
  SIGNUP: 'SIGNUP',
  FIND_EMAIL: 'FIND_EMAIL',
  RESET_PASSWORD: 'RESET_PASSWORD',
})

export class IdentityVerificationError extends Error {
  constructor(message, code = 'IDENTITY_VERIFICATION_FAILED') {
    super(message)
    this.name = 'IdentityVerificationError'
    this.code = code
  }
}

function readPortOneConfig() {
  const storeId = import.meta.env.VITE_PORTONE_STORE_ID?.trim()
  const channelKey = import.meta.env.VITE_PORTONE_CHANNEL_KEY?.trim()

  if (!storeId || !channelKey) {
    throw new IdentityVerificationError(
      '본인인증 환경설정이 완료되지 않았습니다.',
      'PORTONE_CONFIG_MISSING',
    )
  }

  return { storeId, channelKey }
}

function createIdentityVerificationId() {
  if (!globalThis.crypto?.randomUUID) {
    throw new IdentityVerificationError(
      '현재 브라우저에서는 본인인증을 시작할 수 없습니다.',
      'RANDOM_UUID_UNAVAILABLE',
    )
  }

  return `identity-verification-${globalThis.crypto.randomUUID()}`
}

function savePendingVerification(verification) {
  sessionStorage.setItem(PENDING_VERIFICATION_KEY, JSON.stringify(verification))
}

export function getPendingIdentityVerification() {
  try {
    const rawValue = sessionStorage.getItem(PENDING_VERIFICATION_KEY)
    if (!rawValue) return null

    const verification = JSON.parse(rawValue)
    if (
      !verification?.identityVerificationId ||
      !verification?.purpose ||
      Date.now() - Number(verification.createdAt) > VERIFICATION_TTL_MS
    ) {
      clearPendingIdentityVerification()
      return null
    }

    return verification
  } catch {
    clearPendingIdentityVerification()
    return null
  }
}

export function clearPendingIdentityVerification() {
  sessionStorage.removeItem(PENDING_VERIFICATION_KEY)
}

function createRedirectUrl(path, purpose) {
  const redirectUrl = new URL(path, window.location.origin)
  redirectUrl.searchParams.set('verificationPurpose', purpose)
  return redirectUrl.toString()
}

function validateCompletedVerification(identityVerificationId, purpose) {
  const pendingVerification = getPendingIdentityVerification()

  if (
    !pendingVerification ||
    pendingVerification.identityVerificationId !== identityVerificationId ||
    pendingVerification.purpose !== purpose
  ) {
    clearPendingIdentityVerification()
    throw new IdentityVerificationError(
      '본인인증 요청 정보를 확인할 수 없습니다. 다시 시도해 주세요.',
      'IDENTITY_VERIFICATION_MISMATCH',
    )
  }

  const completedVerification = {
    ...pendingVerification,
    portOneCompleted: true,
    completedAt: Date.now(),
  }
  savePendingVerification(completedVerification)
  return completedVerification
}

export async function requestIdentityVerification({ purpose, redirectPath, context = {} }) {
  const { storeId, channelKey } = readPortOneConfig()
  const identityVerificationId = createIdentityVerificationId()
  const pendingVerification = {
    identityVerificationId,
    purpose,
    context,
    createdAt: Date.now(),
    portOneCompleted: false,
  }

  savePendingVerification(pendingVerification)

  try {
    const response = await PortOne.requestIdentityVerification({
      storeId,
      channelKey,
      identityVerificationId,
      redirectUrl: createRedirectUrl(redirectPath, purpose),
      customData: JSON.stringify({ purpose }),
    })

    if (!response) return { redirected: true, verification: pendingVerification }

    if (response.code !== undefined) {
      clearPendingIdentityVerification()
      throw new IdentityVerificationError(
        response.message || '본인인증이 취소되었거나 실패했습니다.',
        response.code,
      )
    }

    return {
      redirected: false,
      verification: validateCompletedVerification(response.identityVerificationId, purpose),
    }
  } catch (error) {
    if (error instanceof IdentityVerificationError) throw error
    clearPendingIdentityVerification()
    throw new IdentityVerificationError(
      error?.message || '본인인증 요청 중 오류가 발생했습니다.',
      error?.code,
    )
  }
}

export function readIdentityVerificationRedirect(query, expectedPurpose) {
  const identityVerificationId = String(query.identityVerificationId || '')
  if (!identityVerificationId) return null

  const purpose = String(query.verificationPurpose || '')
  if (purpose !== expectedPurpose) {
    clearPendingIdentityVerification()
    throw new IdentityVerificationError(
      '본인인증 목적을 확인할 수 없습니다. 다시 시도해 주세요.',
      'IDENTITY_VERIFICATION_PURPOSE_MISMATCH',
    )
  }

  if (query.code) {
    clearPendingIdentityVerification()
    throw new IdentityVerificationError(
      String(query.message || '본인인증이 취소되었거나 실패했습니다.'),
      String(query.code),
    )
  }

  return validateCompletedVerification(identityVerificationId, purpose)
}
