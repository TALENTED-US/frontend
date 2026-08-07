import { ref, unref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import {
  clearPendingIdentityVerification,
  readIdentityVerificationRedirect,
  requestIdentityVerification,
} from '@/features/auth/services/identityVerification'

const SERVER_VERIFICATION_PENDING_MESSAGE =
  '본인인증 요청이 완료되었습니다. 서버 확인 API가 연결되면 다음 단계로 진행할 수 있습니다.'

export function useIdentityVerification(purpose) {
  const route = useRoute()
  const router = useRouter()
  const isVerifying = ref(false)
  const verificationError = ref('')
  const verificationNotice = ref('')
  const completedVerification = ref(null)

  const currentPurpose = () => unref(purpose)

  function markPortOneCompleted(verification) {
    completedVerification.value = verification
    verificationError.value = ''
    verificationNotice.value = SERVER_VERIFICATION_PENDING_MESSAGE
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

      if (!result.redirected) markPortOneCompleted(result.verification)
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
      if (verification) markPortOneCompleted(verification)
      return verification
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
