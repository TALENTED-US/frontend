import { ref, unref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { verifyIdentityApi } from '@/api/auth'
import {
  clearPendingIdentityVerification,
  readIdentityVerificationRedirect,
  requestIdentityVerification,
} from '@/features/auth/services/identityVerification'

export function useIdentityVerification(purpose) {
  const route = useRoute()
  const router = useRouter()
  const isVerifying = ref(false)
  const verificationError = ref('')
  const verificationNotice = ref('')
  const completedVerification = ref(null)

  const currentPurpose = () => unref(purpose)

  async function confirmIdentityVerification(verification) {
    const verificationResult = await verifyIdentityApi(verification.identityVerificationId)
    const completed = {
      ...verification,
      identityVerificationToken: verificationResult?.token || '',
      verifiedCustomer: verificationResult?.verifiedCustomer || null,
    }

    if (!completed.identityVerificationToken) {
      throw new Error('본인인증 확인 토큰을 받지 못했습니다. 다시 시도해 주세요.')
    }

    completedVerification.value = completed
    verificationError.value = ''
    verificationNotice.value = '본인인증이 완료되었습니다.'
    return completed
  }

  async function startIdentityVerification(context = {}) {
    if (isVerifying.value) return null

    isVerifying.value = true
    verificationError.value = ''
    verificationNotice.value = ''
    completedVerification.value = null

    try {
      const result = await requestIdentityVerification({
        purpose: currentPurpose(),
        redirectPath: route.path,
        context,
      })

      if (!result.redirected) {
        result.verification = await confirmIdentityVerification(result.verification)
      }
      return result
    } catch (error) {
      verificationError.value = error.message
      return null
    } finally {
      isVerifying.value = false
    }
  }

  async function restoreIdentityVerificationRedirect() {
    if (!route.query.identityVerificationId) return null

    isVerifying.value = true
    verificationError.value = ''

    try {
      const verification = readIdentityVerificationRedirect(route.query, currentPurpose())
      return verification ? await confirmIdentityVerification(verification) : null
    } catch (error) {
      verificationError.value = error.message
      return null
    } finally {
      isVerifying.value = false
      const nextQuery = { ...route.query }
      delete nextQuery.identityVerificationId
      delete nextQuery.identityVerificationTxId
      delete nextQuery.transactionType
      delete nextQuery.code
      delete nextQuery.message
      delete nextQuery.pgCode
      delete nextQuery.pgMessage
      delete nextQuery.verificationPurpose
      await router.replace({ path: route.path, query: nextQuery })
    }
  }

  function resetIdentityVerification() {
    clearPendingIdentityVerification()
    completedVerification.value = null
    verificationError.value = ''
    verificationNotice.value = ''
  }

  return {
    completedVerification,
    isVerifying,
    verificationError,
    verificationNotice,
    startIdentityVerification,
    restoreIdentityVerificationRedirect,
    resetIdentityVerification,
  }
}
