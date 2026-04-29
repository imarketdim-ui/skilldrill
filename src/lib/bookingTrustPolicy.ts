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

const manualDecision = (
  title: string,
  description: string,
): BookingGateDecision => ({
  mode: 'manual',
  title,
  description,
  allowBooking: false,
  allowManualRequest: true,
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
      'Онлайн-запись ограничена',
      'Этот специалист ограничил онлайн-запись для вашего профиля. Если считаете это ошибкой, свяжитесь с ним другим способом или через поддержку.',
    );
  }

  if (context.activeBookingsCount >= 3) {
    return blockedDecision(
      'Сначала завершите текущие записи',
      'У вас уже есть 3 активные записи. Завершите или отмените существующие, чтобы создать новую.',
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
    return blockedDecision(
      'Онлайн-запись пока недоступна',
      'Для этого профиля действует ограничение по доверию. Вы можете написать мастеру и попросить рассмотреть запись вручную.',
      true,
    );
  }

  if (!context.hasPriorVisitsWithMaster) {
    if (policy.newClientMode === 'block') {
      return blockedDecision(
        'Мастер принимает онлайн только знакомых клиентов',
        'Этот мастер ограничил прямую онлайн-запись для новых клиентов. Напишите ему, чтобы он сам добавил вас в расписание.',
        true,
      );
    }
    if (policy.newClientMode === 'manual') {
      return manualDecision(
        'Для новых клиентов нужна ручная проверка',
        'У этого мастера новые клиенты попадают сначала на ручное согласование. Напишите ему, и он сможет сам подтвердить или создать запись.',
      );
    }
    if (policy.newClientMode === 'prepayment') {
      return prepaymentDecision(
        'Для новых клиентов нужна предоплата',
        'Онлайн-запись для новых клиентов доступна после предоплаты. После оплаты мастер увидит заявку и подтвердит визит.',
      );
    }
  }

  if (context.scoreStatus === 'insufficient_data') {
    if (policy.insufficientDataMode === 'manual') {
      return manualDecision(
        'Пока недостаточно истории на платформе',
        'Это не плохой рейтинг: у вас просто ещё мало истории. Напишите мастеру, и он сможет подтвердить запись вручную.',
      );
    }
    if (policy.insufficientDataMode === 'prepayment') {
      return prepaymentDecision(
        'Для новых профилей нужна предоплата',
        'Пока на платформе недостаточно истории, этот мастер просит подтвердить запись предоплатой.',
      );
    }
    if (policy.insufficientDataMode === 'block') {
      return blockedDecision(
        'Онлайн-запись пока ограничена',
        'Этот мастер принимает по онлайн-записи только клиентов с накопленной историей. Вы можете написать ему и попросить рассмотреть запись вручную.',
        true,
      );
    }
  }

  if (context.scoreStatus === 'prepayment_required' || ((context.score ?? 100) < policy.prepaymentBelowScore)) {
    return prepaymentDecision(
      'Для записи нужна предоплата',
      'У этого профиля повышенные требования к бронированию. Вы можете завершить запись с предоплатой или написать мастеру для согласования.',
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
