import { supabase } from '@/integrations/supabase/client';

const CONTACT_FAVORITE_TYPE = 'contact';

const upsertContact = async (userId: string, targetId: string) => {
  if (!userId || !targetId || userId === targetId) return;

  await supabase.from('favorites').upsert(
    {
      user_id: userId,
      target_id: targetId,
      favorite_type: CONTACT_FAVORITE_TYPE,
    },
    { onConflict: 'user_id,favorite_type,target_id' },
  );
};

export const syncBidirectionalContacts = async (leftUserId?: string | null, rightUserId?: string | null) => {
  if (!leftUserId || !rightUserId || leftUserId === rightUserId) return;

  await Promise.all([
    upsertContact(leftUserId, rightUserId),
    upsertContact(rightUserId, leftUserId),
  ]);
};

export const syncOneWayContact = async (userId?: string | null, targetUserId?: string | null) => {
  if (!userId || !targetUserId || userId === targetUserId) return;
  await upsertContact(userId, targetUserId);
};

export const isSelfInteraction = (leftUserId?: string | null, rightUserId?: string | null) =>
  Boolean(leftUserId && rightUserId && leftUserId === rightUserId);
