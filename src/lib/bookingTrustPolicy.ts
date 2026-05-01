export type RatingGateMode = 'allow' | 'manual' | 'prepayment' | 'block';

export interface BookingTrustPolicySettings {
  enabled: boolean;
  newClientMode: RatingGateMode;
  insufficientDataMode: RatingGateMode;
  trustedAutoConfirmScore: number;
  prepaymentBelowScore: number;
  blockBelowScore: number;
  customPolicyMessage: string;
}

export interface BookingTrustContext {
  isBlacklisted: boolean;
  activeBookingsCount: number;
  hasPriorVisitsWithMaster: boolean;
  score: number | null;
  scoreStatus: string | null;
  masterAutoBookingPolicy: string | null;
}

export interface BookingGateDecision {
  mode: RatingGateMode | 'confirm' | 'pending';
  title: string;
  description: string;
  allowBooking: boolean;
  allowManualRequest: boolean;
  bookingStatus?: 'confirmed' | 'pending';
}

export const defaultBookingTrustPolicy: BookingTrustPolicySettings = {
  enabled: true,
  newClientMode: 'manual',
  insufficientDataMode: 'manual',
  trustedAutoConfirmScore: 80,
  prepaymentBelowScore: 50,
  blockBelowScore: 40,
  customPolicyMessage: '',
};

const buildConfirmedStatus = (
  context: BookingTrustContext,
  trustedAutoConfirmScore: number,
): 'confirmed' | 'pending' => {
  if ((context.score || 0) >= trustedAutoConfirmScore) {
    return 'confirmed';
  }

  const policy = context.masterAutoBookingPolicy || 'all';
  if (policy === 'all') return 'confirmed';
  if (policy === 'known' && context.hasPriorVisitsWithMaster) return 'confirmed';
  return 'pending';
};

export const normalizeBookingTrustPolicy = (
  raw: unknown,
): BookingTrustPolicySettings => {
  const value = (raw && typeof raw === 'object' ? raw : {}) as Record<string, unknown>;
  return {
    enabled: value.enabled !== false,
    newClientMode: (value.newClientMode as RatingGateMode) || defaultBookingTrustPolicy.newClientMode,
    insufficientDataMode:
      (value.insufficientDataMode as RatingGateMode) || defaultBookingTrustPolicy.insufficientDataMode,
    trustedAutoConfirmScore:
      Number(value.trustedAutoConfirmScore ?? defaultBookingTrustPolicy.trustedAutoConfirmScore),
    prepaymentBelowScore:
      Number(value.prepaymentBelowScore ?? defaultBookingTrustPolicy.prepaymentBelowScore),
    blockBelowScore:
      Number(value.blockBelowScore ?? defaultBookingTrustPolicy.blockBelowScore),
    customPolicyMessage: String(value.customPolicyMessage || ''),
  };
};

const pendingApprovalDecision = (
  title: string,
  description: string,
): BookingGateDecision => ({
  mode: 'pending',
  title,
  description,
  allowBooking: true,
  allowManualRequest: true,
  bookingStatus: 'pending',
});

const prepaymentDecision = (
  title: string,
  description: string,
): BookingGateDecision => ({
  mode: 'prepayment',
  title,
  description,
  allowBooking: true,
  allowManualRequest: true,
  bookingStatus: 'pending',
});

const blockedDecision = (
  title: string,
  description: string,
  allowManualRequest = false,
): BookingGateDecision => ({
  mode: 'block',
  title,
  description,
  allowBooking: false,
  allowManualRequest,
});

export const evaluateBookingGate = (
  context: BookingTrustContext,
  policyInput: unknown,
): BookingGateDecision => {
  const policy = normalizeBookingTrustPolicy(policyInput);

  if (context.isBlacklisted) {
    return blockedDecision(
      'Запись сейчас недоступна',
      'Сейчас вы не можете отправить новую заявку этому мастеру. Если ситуация изменилась, попробуйте позже или обратитесь в поддержку.',
    );
  }

  if (context.activeBookingsCount >= 3) {
    return blockedDecision(
      'Сначала завершите текущие записи',
      'У вас уже есть 3 активные записи. Завершите или отмените одну из них, а если вопрос срочный — уточните детали в сообщениях.',
    );
  }

  if (!policy.enabled) {
    const status = buildConfirmedStatus(context, policy.trustedAutoConfirmScore);
    return {
      mode: status === 'confirmed' ? 'confirm' : 'pending',
      title: status === 'confirmed' ? 'Запись будет подтверждена автоматически' : 'Запись отправится на подтверждение',
      description: status === 'confirmed'
        ? 'Онлайн-запись для вашего профиля доступна без дополнительных ограничений.'
        : 'Мастер проверит заявку вручную и ответит в уведомлениях.',
      allowBooking: true,
      allowManualRequest: true,
      bookingStatus: status,
    };
  }

  if (context.scoreStatus === 'blocked' || ((context.score ?? 100) < policy.blockBelowScore)) {
    return pendingApprovalDecision(
      'Нужно подтверждение мастером',
      'Сейчас автоматическая запись недоступна. Создайте заявку и ожидайте подтверждения мастером или организацией.',
    );
  }

  if (!context.hasPriorVisitsWithMaster) {
    if (policy.newClientMode === 'block') {
      return pendingApprovalDecision(
        'Для новых клиентов нужно подтверждение',
        'Сейчас автоматическая запись для новых клиентов недоступна. Создайте заявку, и мастер подтвердит её вручную.',
      );
    }
    if (policy.newClientMode === 'manual') {
      return pendingApprovalDecision(
        'Для новых клиентов нужно подтверждение',
        'Сейчас запись для новых клиентов подтверждается мастером вручную. Создайте заявку и ожидайте подтверждения.',
      );
    }
    if (policy.newClientMode === 'prepayment') {
      return prepaymentDecision(
        'Для новых клиентов нужна предоплата',
        'По настройкам мастера или организации автоматическая запись для новых клиентов доступна после предоплаты. Если хотите уточнить детали, напишите мастеру напрямую.',
      );
    }
  }

  if (context.scoreStatus === 'insufficient_data') {
    if (policy.insufficientDataMode === 'manual') {
      return pendingApprovalDecision(
        'Нужно подтверждение мастером',
        'У вас пока мало истории на платформе, поэтому запись подтверждается вручную. Создайте заявку и ожидайте подтверждения.',
      );
    }
    if (policy.insufficientDataMode === 'prepayment') {
      return prepaymentDecision(
        'Для новых профилей нужна предоплата',
        'Пока на платформе недостаточно истории, по настройкам мастера или организации запись подтверждается предоплатой. Если нужно, уточните детали у мастера напрямую.',
      );
    }
    if (policy.insufficientDataMode === 'block') {
      return pendingApprovalDecision(
        'Нужно подтверждение мастером',
        'Сейчас запись для профилей без достаточной истории подтверждается вручную. Создайте заявку и ожидайте подтверждения.',
      );
    }
  }

  if (context.scoreStatus === 'prepayment_required' || ((context.score ?? 100) < policy.prepaymentBelowScore)) {
    return prepaymentDecision(
      'Для записи нужна предоплата',
      'По настройкам мастера или организации для такой записи нужна предоплата. После оплаты заявка будет отправлена на подтверждение.',
    );
  }

  const bookingStatus = buildConfirmedStatus({
    ...context,
    masterAutoBookingPolicy:
      (context.score ?? 0) >= policy.trustedAutoConfirmScore
        ? 'all'
        : context.masterAutoBookingPolicy,
  }, policy.trustedAutoConfirmScore);

  return {
    mode: bookingStatus === 'confirmed' ? 'confirm' : 'pending',
    title: bookingStatus === 'confirmed'
      ? 'Запись будет подтверждена автоматически'
      : 'Запись отправится на подтверждение',
    description: policy.customPolicyMessage
      || (bookingStatus === 'confirmed'
        ? 'Ваш профиль соответствует правилам онлайн-записи этого мастера.'
        : 'Мастер проверит заявку вручную и ответит в уведомлениях.'),
    allowBooking: true,
    allowManualRequest: true,
    bookingStatus,
  };
};
