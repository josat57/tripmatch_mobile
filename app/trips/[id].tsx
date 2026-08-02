import { useEffect, useState, useCallback } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet,
  ActivityIndicator, Alert, Modal, TextInput,
} from 'react-native';

import { Stack, useLocalSearchParams, router, useNavigation } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Trips, Users, Feed, TripComments, Payments } from '../../src/api/api';
import PaymentWebView from '../../src/components/PaymentWebView';
import { useAuth } from '../../src/contexts/AuthContext';
import { Colors, Fonts } from '../../src/theme';

type Tab = 'info' | 'members' | 'requests' | 'comments';

interface TripDetail {
  _id: string;
  title: string;
  description?: string;
  category: string;
  status: string;
  startDate?: string;
  endDate?: string;
  budget?: { amount?: number; currency?: string };
  capacity?: { max?: number };
  participants?: Array<{
    _id: string;
    firstName: string;
    lastName: string;
    profileImage?: string;
  }>;
  organizer?: {
    _id: string;
    firstName: string;
    lastName: string;
    profileImage?: string;
  };
  locations?: { address?: { city?: string; country?: string; street?: string } };
  boost?: { active?: boolean };
  travelStyle?: string[];
}

interface JoinRequest {
  _id: string;
  userId: string;
  firstName: string;
  lastName: string;
  profileImage?: string;
  message?: string;
  status: string;
}

export default function TripDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { user } = useAuth();
  const navigation = useNavigation();

  const [trip, setTrip]             = useState<TripDetail | null>(null);
  const [requests, setRequests]     = useState<JoinRequest[]>([]);
  const [loading, setLoading]       = useState(true);
  const [tab, setTab]               = useState<Tab>('info');
  const [joining, setJoining]       = useState(false);
  const [acting, setActing]         = useState<Set<string>>(new Set());
  const [isLiked, setIsLiked]       = useState(false);
  const [liking, setLiking]         = useState(false);

  // Review state
  const [reviewVisible, setReviewVisible]       = useState(false);
  const [reviewRating, setReviewRating]         = useState(0);
  const [reviewComment, setReviewComment]       = useState('');
  const [reviewSubmitting, setReviewSubmitting] = useState(false);
  const [reviewDone, setReviewDone]             = useState(false);

  // Comments state
  const [comments, setComments]         = useState<Array<{ _id: string; user?: { firstName: string; lastName: string }; content: string; createdAt: string }>>([]);
  const [commentInput, setCommentInput]  = useState('');
  const [commentsLoading, setCommentsLoading] = useState(false);
  const [commentSubmitting, setCommentSubmitting] = useState(false);

  // Boost state
  const [showBoostModal, setShowBoostModal] = useState(false);
  const [boostOption, setBoostOption] = useState<3 | 7 | 14>(7);
  const [showPayment, setShowPayment] = useState(false);
  const [boostCheckout, setBoostCheckout] = useState<any>(null);

  const load = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    try {
      const data = await Trips.getById(id);
      setTrip((data as { trip?: TripDetail }).trip ?? data as TripDetail);
    } catch {
      Alert.alert('Error', 'Could not load trip details.');
      router.back();
    } finally {
      setLoading(false);
    }
  }, [id]);

  const loadRequests = useCallback(async () => {
    if (!id) return;
    try {
      const data = await Trips.getJoinRequests(id);
      const list = data as JoinRequest[] | { requests?: JoinRequest[] };
      setRequests(Array.isArray(list) ? list : (list as { requests?: JoinRequest[] }).requests ?? []);
    } catch {}
  }, [id]);

  const loadComments = useCallback(async () => {
    if (!id) return;
    setCommentsLoading(true);
    try {
      const data = await TripComments.list(id);
      const list = data as any[] | { comments?: any[] };
      setComments(Array.isArray(list) ? list : (list as { comments?: any[] }).comments ?? []);
    } catch {
      setComments([]);
    } finally {
      setCommentsLoading(false);
    }
  }, [id]);

  useEffect(() => { load(); }, [load]);
  useEffect(() => {
    if (tab === 'requests') loadRequests();
    if (tab === 'comments') loadComments();
  }, [tab, loadRequests, loadComments]);

  const handleJoin = async () => {
    if (!id) return;
    setJoining(true);
    try {
      await Trips.requestToJoin(id);
      Alert.alert('Request sent!', 'The organiser will review your join request.');
      load();
    } catch {
      Alert.alert('Error', 'Could not send join request.');
    } finally {
      setJoining(false);
    }
  };

  const handleBoostClick = () => {
    setShowBoostModal(true);
  };

  const handleInitiateBoost = async () => {
    if (!id) return;
    setShowBoostModal(false);
    try {
      const boostPrices = { 3: 10, 7: 25, 14: 50 };
      const boostData = await Payments.createIntent(
        boostPrices[boostOption] * 100,
        'trip_boost',
        { tripId: id, days: String(boostOption) }
      );
      setBoostCheckout(boostData);
      setShowPayment(true);
    } catch (err) {
      Alert.alert(
        'Error',
        (err as any)?.response?.data?.message ?? 'Could not initiate boost. Please try again.'
      );
    }
  };

  const handleRequest = async (requestId: string, action: 'approve' | 'reject') => {
    if (!id) return;
    setActing((p) => new Set(p).add(requestId));
    try {
      if (action === 'approve') await Trips.approveRequest(id, requestId);
      else await Trips.rejectRequest(id, requestId);
      setRequests((prev) => prev.filter((r) => r._id !== requestId));
    } catch {
      Alert.alert('Error', `Could not ${action} request.`);
    } finally {
      setActing((p) => { const n = new Set(p); n.delete(requestId); return n; });
    }
  };

  const handleBlockReport = (targetUserId: string, name: string) => {
    Alert.alert(`Report or block ${name}`, 'What would you like to do?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Block user',
        style: 'destructive',
        onPress: async () => {
          try {
            await Users.block(targetUserId);
            Alert.alert('Blocked', `${name} has been blocked.`);
          } catch {
            Alert.alert('Error', 'Could not block user.');
          }
        },
      },
      {
        text: 'Report user',
        onPress: () => {
          Alert.prompt('Report', 'Briefly describe the issue:', async (reason) => {
            if (!reason) return;
            try {
              await Users.report(targetUserId, reason);
              Alert.alert('Reported', 'Thank you. Our team will review this.');
            } catch {
              Alert.alert('Error', 'Could not submit report.');
            }
          });
        },
      },
    ]);
  };

  const handleAddComment = useCallback(async () => {
    if (!id || !commentInput.trim()) return;
    setCommentSubmitting(true);
    try {
      await TripComments.add(id, commentInput.trim());
      setCommentInput('');
      await loadComments();
    } catch {
      Alert.alert('Error', 'Could not post comment.');
    } finally {
      setCommentSubmitting(false);
    }
  }, [id, commentInput, loadComments]);

  const handleLikeTrip = useCallback(async () => {
    if (!id) return;
    setLiking(true);
    try {
      if (isLiked) {
        await Feed.unlikeTrip(id);
        setIsLiked(false);
      } else {
        await Feed.likeTrip(id);
        setIsLiked(true);
      }
    } catch {
      Alert.alert('Error', isLiked ? 'Could not unlike trip.' : 'Could not like trip.');
    } finally {
      setLiking(false);
    }
  }, [id, isLiked]);

  const submitReview = async () => {
    if (!id || reviewRating === 0) {
      Alert.alert('Rating required', 'Please tap a star to rate this trip.');
      return;
    }
    setReviewSubmitting(true);
    try {
      await Trips.addReview(id, reviewRating, reviewComment.trim());
      setReviewVisible(false);
      setReviewRating(0);
      setReviewComment('');
      setReviewDone(true);
      Alert.alert('Review submitted!', 'Thank you for sharing your experience.');
    } catch {
      Alert.alert('Error', 'Could not submit your review. Please try again.');
    } finally {
      setReviewSubmitting(false);
    }
  };

  if (loading || !trip) {
    return (
      <>
        <Stack.Screen options={{ title: 'Trip Details', headerShown: true }} />
        <View style={styles.center}>
          <ActivityIndicator size="large" color={Colors.primary} />
        </View>
      </>
    );
  }

  const isOrganizer = trip.organizer?._id === user?._id;
  const isParticipant = (trip.participants ?? []).some((p) => p._id === user?._id);
  const tripEnded = trip.endDate ? new Date(trip.endDate) < new Date() : false;
  const canReview = isParticipant && !isOrganizer && tripEnded && !reviewDone;

  const start = trip.startDate
    ? new Date(trip.startDate).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })
    : null;
  const end = trip.endDate
    ? new Date(trip.endDate).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })
    : null;
  const city    = trip.locations?.address?.city ?? '';
  const country = trip.locations?.address?.country ?? '';
  const destination = [city, country].filter(Boolean).join(', ');

  const TABS: { key: Tab; label: string }[] = [
    { key: 'info',     label: 'Info' },
    { key: 'members',  label: `Members (${(trip.participants ?? []).length})` },
    { key: 'comments', label: `Comments (${comments.length})` },
    ...(isOrganizer ? [{ key: 'requests' as Tab, label: `Requests (${requests.length})` }] : []),
  ];

  return (
    <>
      <Stack.Screen
        options={{
          title: trip.title,
          headerShown: true,
          headerRight: () => (
            <TouchableOpacity
              onPress={handleLikeTrip}
              disabled={liking}
              style={{ marginRight: 16 }}
              accessibilityLabel={isLiked ? 'Unlike trip' : 'Like trip'}
            >
              <Ionicons
                name={isLiked ? 'heart' : 'heart-outline'}
                size={24}
                color={isLiked ? Colors.error : Colors.textMuted}
              />
            </TouchableOpacity>
          ),
        }}
      />
      <View style={styles.container}>
        {/* Tab bar */}
        <View style={styles.tabBar}>
          {TABS.map((t) => (
            <TouchableOpacity
              key={t.key}
              style={[styles.tabBtn, tab === t.key && styles.tabBtnActive]}
              onPress={() => setTab(t.key)}
              accessibilityLabel={t.label}
            >
              <Text style={[styles.tabBtnText, tab === t.key && styles.tabBtnTextActive]}>
                {t.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        <ScrollView contentContainerStyle={styles.content}>
          {/* ── INFO ── */}
          {tab === 'info' && (
            <>
              {trip.boost?.active && (
                <View style={styles.featuredBadge}>
                  <Text style={styles.featuredText}>⭐ Featured Trip</Text>
                </View>
              )}

              <Text style={styles.tripTitle}>{trip.title}</Text>

              {destination ? (
                <>
                  <View style={styles.metaRow}>
                    <Ionicons name="location-outline" size={15} color={Colors.textMuted} />
                    <Text style={styles.metaText}>{destination}</Text>
                  </View>
                  <TouchableOpacity
                    style={styles.mapLinkBtn}
                    onPress={() => router.push({ pathname: '/trips/location', params: { id: id!, tripTitle: trip.title } })}
                  >
                    <Ionicons name="map" size={14} color={Colors.primary} />
                    <Text style={styles.mapLinkText}>View Map</Text>
                  </TouchableOpacity>
                </>
              ) : null}

              {start && (
                <View style={styles.metaRow}>
                  <Ionicons name="calendar-outline" size={15} color={Colors.textMuted} />
                  <Text style={styles.metaText}>{start}{end && end !== start ? ` → ${end}` : ''}</Text>
                </View>
              )}

              {trip.budget?.amount != null && (
                <View style={styles.metaRow}>
                  <Ionicons name="cash-outline" size={15} color={Colors.textMuted} />
                  <Text style={styles.metaText}>
                    ${trip.budget.amount.toLocaleString()} {trip.budget.currency ?? 'USD'} per person
                  </Text>
                </View>
              )}

              {trip.capacity?.max != null && (
                <View style={styles.metaRow}>
                  <Ionicons name="people-outline" size={15} color={Colors.textMuted} />
                  <Text style={styles.metaText}>
                    {(trip.participants ?? []).length}/{trip.capacity.max} spots filled
                  </Text>
                </View>
              )}

              {trip.description ? (
                <View style={styles.section}>
                  <Text style={styles.sectionTitle}>About this trip</Text>
                  <Text style={styles.body}>{trip.description}</Text>
                </View>
              ) : null}

              {(trip.travelStyle ?? []).length > 0 && (
                <View style={styles.section}>
                  <Text style={styles.sectionTitle}>Travel style</Text>
                  <View style={styles.chips}>
                    {(trip.travelStyle ?? []).map((s) => (
                      <View key={s} style={styles.chip}>
                        <Text style={styles.chipText}>{s}</Text>
                      </View>
                    ))}
                  </View>
                </View>
              )}

              {trip.organizer && (
                <View style={styles.section}>
                  <Text style={styles.sectionTitle}>Organised by</Text>
                  <View style={styles.personRow}>
                    {trip.organizer.profileImage ? (
                      <Image source={{ uri: trip.organizer.profileImage }} style={styles.personAvatar} />
                    ) : (
                      <View style={styles.personAvatarPlaceholder}>
                        <Text style={styles.personInitials}>
                          {trip.organizer.firstName?.[0]}{trip.organizer.lastName?.[0]}
                        </Text>
                      </View>
                    )}
                    <Text style={styles.personName}>
                      {trip.organizer.firstName} {trip.organizer.lastName}
                    </Text>
                    {!isOrganizer && (
                      <TouchableOpacity
                        onPress={() => router.push({
                          pathname: '/messages/[id]',
                          params: {
                            id: trip.organizer!._id,
                            name: `${trip.organizer!.firstName} ${trip.organizer!.lastName}`,
                            avatar: trip.organizer!.profileImage ?? '',
                          },
                        })}
                        accessibilityLabel={`Message ${trip.organizer.firstName}`}
                      >
                        <Ionicons name="chatbubble-outline" size={20} color={Colors.primary} />
                      </TouchableOpacity>
                    )}
                  </View>
                </View>
              )}

              {/* Expenses link for members/organizer */}
              {(isOrganizer || isParticipant) && (
                <TouchableOpacity
                  style={styles.expensesBtn}
                  onPress={() => router.push({ pathname: '/trips/[id]/expenses' as never, params: { id } })}
                  accessibilityLabel="View trip expenses"
                >
                  <Ionicons name="wallet-outline" size={18} color={Colors.ocean} />
                  <Text style={styles.expensesBtnText}>Trip Expenses</Text>
                  <Ionicons name="chevron-forward" size={16} color={Colors.ocean} />
                </TouchableOpacity>
              )}

              {!isOrganizer && !isParticipant && (
                <TouchableOpacity style={styles.joinBtn} onPress={handleJoin} disabled={joining}>
                  {joining ? (
                    <ActivityIndicator color={Colors.white} />
                  ) : (
                    <>
                      <Ionicons name="add-circle-outline" size={18} color={Colors.white} />
                      <Text style={styles.joinBtnText}>Request to Join</Text>
                    </>
                  )}
                </TouchableOpacity>
              )}

              {isParticipant && (
                <View style={styles.joinedBadge}>
                  <Ionicons name="checkmark-circle" size={18} color={Colors.forest} />
                  <Text style={styles.joinedText}>You are a member of this trip</Text>
                </View>
              )}

              {isOrganizer && (
                <>
                  <View style={styles.joinedBadge}>
                    <Ionicons name="star-outline" size={18} color={Colors.primary} />
                    <Text style={[styles.joinedText, { color: Colors.primary }]}>You organised this trip</Text>
                  </View>

                  {!trip?.boost?.active && (
                    <TouchableOpacity
                      style={styles.boostBtn}
                      onPress={handleBoostClick}
                      accessibilityLabel="Boost this trip"
                    >
                      <Ionicons name="flash-outline" size={18} color={Colors.white} />
                      <Text style={styles.boostBtnText}>Boost This Trip</Text>
                    </TouchableOpacity>
                  )}

                  {trip?.boost?.active && (
                    <View style={styles.boostActiveBadge}>
                      <Ionicons name="flash" size={18} color={Colors.primary} />
                      <Text style={styles.boostActiveText}>This trip is boosted</Text>
                    </View>
                  )}
                </>
              )}

              {/* Leave a review (past participants only) */}
              {canReview && (
                <TouchableOpacity
                  style={styles.reviewBtn}
                  onPress={() => setReviewVisible(true)}
                  accessibilityLabel="Leave a review for this trip"
                >
                  <Ionicons name="star-half-outline" size={18} color={Colors.primaryDark} />
                  <Text style={styles.reviewBtnText}>Leave a Review</Text>
                </TouchableOpacity>
              )}

              {reviewDone && (
                <View style={styles.reviewDoneBadge}>
                  <Ionicons name="checkmark-circle" size={16} color={Colors.forest} />
                  <Text style={styles.reviewDoneText}>Review submitted — thank you!</Text>
                </View>
              )}
            </>
          )}

          {/* ── MEMBERS ── */}
          {tab === 'members' && (
            <>
              {(trip.participants ?? []).length === 0 ? (
                <View style={styles.emptyCenter}>
                  <Ionicons name="people-outline" size={40} color={Colors.border} />
                  <Text style={styles.emptyText}>No members yet</Text>
                </View>
              ) : (
                (trip.participants ?? []).map((p) => (
                  <View key={p._id} style={styles.personCard}>
                    {p.profileImage ? (
                      <Image source={{ uri: p.profileImage }} style={styles.personAvatar} />
                    ) : (
                      <View style={styles.personAvatarPlaceholder}>
                        <Text style={styles.personInitials}>{p.firstName?.[0]}{p.lastName?.[0]}</Text>
                      </View>
                    )}
                    <Text style={styles.personName}>{p.firstName} {p.lastName}</Text>
                    {p._id !== user?._id && (
                      <View style={styles.memberActions}>
                        <TouchableOpacity
                          onPress={() => router.push({
                            pathname: '/messages/[id]',
                            params: { id: p._id, name: `${p.firstName} ${p.lastName}`, avatar: p.profileImage ?? '' },
                          })}
                          accessibilityLabel={`Message ${p.firstName}`}
                        >
                          <Ionicons name="chatbubble-outline" size={20} color={Colors.primary} />
                        </TouchableOpacity>
                        <TouchableOpacity
                          onPress={() => handleBlockReport(p._id, `${p.firstName} ${p.lastName}`)}
                          accessibilityLabel={`Report or block ${p.firstName}`}
                        >
                          <Ionicons name="ellipsis-horizontal" size={20} color={Colors.textLight} />
                        </TouchableOpacity>
                      </View>
                    )}
                  </View>
                ))
              )}
            </>
          )}

          {/* ── COMMENTS ── */}
          {tab === 'comments' && (
            <>
              {commentsLoading ? (
                <View style={styles.center}>
                  <ActivityIndicator size="large" color={Colors.primary} />
                </View>
              ) : (
                <>
                  {comments.length === 0 ? (
                    <View style={styles.emptyCenter}>
                      <Ionicons name="chatbubble-outline" size={40} color={Colors.border} />
                      <Text style={styles.emptyText}>No comments yet</Text>
                      <Text style={styles.emptySub}>Be the first to share your thoughts!</Text>
                    </View>
                  ) : (
                    comments.map((c) => (
                      <View key={c._id} style={styles.commentCard}>
                        <View style={styles.commentHeader}>
                          <Text style={styles.commentAuthor}>
                            {c.user?.firstName} {c.user?.lastName}
                          </Text>
                          <Text style={styles.commentTime}>
                            {new Date(c.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                          </Text>
                        </View>
                        <Text style={styles.commentText}>{c.content}</Text>
                      </View>
                    ))
                  )}

                  <View style={styles.commentInputContainer}>
                    <TextInput
                      style={styles.commentInput}
                      value={commentInput}
                      onChangeText={setCommentInput}
                      placeholder="Add a comment…"
                      placeholderTextColor={Colors.textLight}
                      multiline
                      maxLength={300}
                      editable={!commentSubmitting}
                    />
                    <TouchableOpacity
                      style={[styles.commentSubmitBtn, (!commentInput.trim() || commentSubmitting) && styles.commentSubmitBtnDisabled]}
                      onPress={handleAddComment}
                      disabled={!commentInput.trim() || commentSubmitting}
                    >
                      {commentSubmitting ? (
                        <ActivityIndicator size="small" color={Colors.white} />
                      ) : (
                        <Ionicons name="arrow-up" size={16} color={Colors.white} />
                      )}
                    </TouchableOpacity>
                  </View>
                </>
              )}
            </>
          )}

          {/* ── REQUESTS (organizer only) ── */}
          {tab === 'requests' && (
            <>
              {requests.length === 0 ? (
                <View style={styles.emptyCenter}>
                  <Ionicons name="mail-open-outline" size={40} color={Colors.border} />
                  <Text style={styles.emptyText}>No pending requests</Text>
                </View>
              ) : (
                requests.map((req) => (
                  <View key={req._id} style={styles.requestCard}>
                    {req.profileImage ? (
                      <Image source={{ uri: req.profileImage }} style={styles.personAvatar} />
                    ) : (
                      <View style={styles.personAvatarPlaceholder}>
                        <Text style={styles.personInitials}>{req.firstName?.[0]}{req.lastName?.[0]}</Text>
                      </View>
                    )}
                    <View style={styles.requestInfo}>
                      <Text style={styles.personName}>{req.firstName} {req.lastName}</Text>
                      {req.message ? (
                        <Text style={styles.requestMsg} numberOfLines={2}>{req.message}</Text>
                      ) : null}
                      <View style={styles.requestActions}>
                        <TouchableOpacity
                          style={styles.approveBtn}
                          disabled={acting.has(req._id)}
                          onPress={() => handleRequest(req._id, 'approve')}
                        >
                          {acting.has(req._id) ? (
                            <ActivityIndicator size="small" color={Colors.white} />
                          ) : (
                            <Text style={styles.approveBtnText}>Approve</Text>
                          )}
                        </TouchableOpacity>
                        <TouchableOpacity
                          style={styles.rejectBtn}
                          disabled={acting.has(req._id)}
                          onPress={() => handleRequest(req._id, 'reject')}
                        >
                          <Text style={styles.rejectBtnText}>Decline</Text>
                        </TouchableOpacity>
                      </View>
                    </View>
                  </View>
                ))
              )}
            </>
          )}
        </ScrollView>
      </View>

      {/* Review Modal */}
      <Modal
        visible={reviewVisible}
        animationType="slide"
        transparent
        onRequestClose={() => setReviewVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Rate this Trip</Text>
              <TouchableOpacity onPress={() => setReviewVisible(false)} accessibilityLabel="Close review">
                <Ionicons name="close" size={22} color={Colors.textMuted} />
              </TouchableOpacity>
            </View>

            <Text style={styles.modalSub}>How was your experience on {trip.title}?</Text>

            {/* Star rating */}
            <View style={styles.starsRow}>
              {[1, 2, 3, 4, 5].map((star) => (
                <TouchableOpacity
                  key={star}
                  onPress={() => setReviewRating(star)}
                  accessibilityLabel={`Rate ${star} star${star > 1 ? 's' : ''}`}
                >
                  <Ionicons
                    name={reviewRating >= star ? 'star' : 'star-outline'}
                    size={36}
                    color={reviewRating >= star ? Colors.primary : Colors.border}
                  />
                </TouchableOpacity>
              ))}
            </View>

            {reviewRating > 0 && (
              <Text style={styles.ratingLabel}>
                {['', 'Poor', 'Fair', 'Good', 'Very Good', 'Excellent'][reviewRating]}
              </Text>
            )}

            <TextInput
              style={styles.reviewInput}
              value={reviewComment}
              onChangeText={setReviewComment}
              placeholder="Share your experience (optional)…"
              placeholderTextColor={Colors.textLight}
              multiline
              numberOfLines={4}
              maxLength={500}
            />

            <TouchableOpacity
              style={[styles.submitReviewBtn, reviewRating === 0 && styles.submitReviewBtnDisabled]}
              onPress={submitReview}
              disabled={reviewSubmitting || reviewRating === 0}
            >
              {reviewSubmitting ? (
                <ActivityIndicator color={Colors.white} />
              ) : (
                <Text style={styles.submitReviewBtnText}>Submit Review</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Boost Modal */}
      <Modal
        visible={showBoostModal}
        animationType="slide"
        transparent
        onRequestClose={() => setShowBoostModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.boostModalCard}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Boost This Trip</Text>
              <TouchableOpacity onPress={() => setShowBoostModal(false)} accessibilityLabel="Close boost">
                <Ionicons name="close" size={22} color={Colors.textMuted} />
              </TouchableOpacity>
            </View>

            <Text style={styles.modalSub}>Get more visibility for your trip</Text>

            <View style={styles.boostOptions}>
              {[
                { days: 3 as const, price: 10, reach: '~200 extra views' },
                { days: 7 as const, price: 25, reach: '~500 extra views' },
                { days: 14 as const, price: 50, reach: '~1,200 extra views' },
              ].map((opt) => (
                <TouchableOpacity
                  key={opt.days}
                  style={[styles.boostOption, boostOption === opt.days && styles.boostOptionActive]}
                  onPress={() => setBoostOption(opt.days)}
                >
                  <View>
                    <Text style={[styles.boostOptionDays, boostOption === opt.days && styles.boostOptionDaysActive]}>
                      {opt.days} days
                    </Text>
                    <Text style={[styles.boostOptionReach, boostOption === opt.days && styles.boostOptionReachActive]}>
                      {opt.reach}
                    </Text>
                  </View>
                  <Text style={[styles.boostOptionPrice, boostOption === opt.days && styles.boostOptionPriceActive]}>
                    ${opt.price}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <TouchableOpacity style={styles.boostConfirmBtn} onPress={handleInitiateBoost}>
              <Text style={styles.boostConfirmBtnText}>Continue to Payment</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Boost Payment WebView */}
      {boostCheckout && (
        <PaymentWebView
          visible={showPayment}
          provider="stripe"
          amount={Math.round(boostCheckout.amount / 100)}
          currency="USD"
          clientSecret={boostCheckout.clientSecret}
          onClose={() => {
            setShowPayment(false);
            setBoostCheckout(null);
          }}
          onSuccess={() => {
            setShowPayment(false);
            setBoostCheckout(null);
            load();
            Alert.alert('Success', 'Your trip is now boosted!');
          }}
        />
      )}
    </>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.mist },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  tabBar: {
    flexDirection: 'row',
    backgroundColor: Colors.bgCard,
    borderBottomWidth: 1,
    borderBottomColor: Colors.borderLight,
  },
  tabBtn: {
    flex: 1,
    paddingVertical: 13,
    alignItems: 'center',
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  tabBtnActive: { borderBottomColor: Colors.primary },
  tabBtnText: { fontSize: 13, fontFamily: Fonts.bodySemiBold, color: Colors.textLight },
  tabBtnTextActive: { color: Colors.primary },
  content: { padding: 20, gap: 4 },
  featuredBadge: {
    alignSelf: 'flex-start',
    backgroundColor: Colors.primary,
    borderRadius: 6,
    paddingHorizontal: 10,
    paddingVertical: 4,
    marginBottom: 10,
  },
  featuredText: { fontSize: 11, fontFamily: Fonts.bodyBold, color: Colors.white },
  tripTitle: { fontSize: 22, fontFamily: Fonts.heading, color: Colors.textDark, marginBottom: 14, lineHeight: 30 },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 8 },
  metaText: { fontSize: 14, fontFamily: Fonts.body, color: Colors.textMuted },
  section: { marginTop: 20 },
  sectionTitle: { fontSize: 14, fontFamily: Fonts.bodySemiBold, color: Colors.textBody, marginBottom: 8 },
  body: { fontSize: 14, fontFamily: Fonts.body, color: Colors.textMuted, lineHeight: 22 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: {
    backgroundColor: Colors.bgCard,
    borderRadius: 100,
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderWidth: 1,
    borderColor: Colors.primaryLight,
  },
  chipText: { fontSize: 12, fontFamily: Fonts.bodySemiBold, color: Colors.forest },
  personRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  personCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: Colors.bgCard,
    borderRadius: 14,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  personAvatar: { width: 44, height: 44, borderRadius: 22 },
  personAvatarPlaceholder: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: Colors.mist,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.primary,
  },
  personInitials: { fontSize: 15, fontFamily: Fonts.bodyBold, color: Colors.primaryDark },
  personName: { flex: 1, fontSize: 15, fontFamily: Fonts.bodyBold, color: Colors.textDark },
  memberActions: { flexDirection: 'row', gap: 12 },
  requestCard: {
    flexDirection: 'row',
    gap: 12,
    backgroundColor: Colors.bgCard,
    borderRadius: 14,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  requestInfo: { flex: 1 },
  requestMsg: { fontSize: 13, fontFamily: Fonts.body, color: Colors.textMuted, marginTop: 2, marginBottom: 10, lineHeight: 18 },
  requestActions: { flexDirection: 'row', gap: 8 },
  approveBtn: {
    flex: 1,
    backgroundColor: Colors.primary,
    borderRadius: 8,
    paddingVertical: 8,
    alignItems: 'center',
  },
  approveBtnText: { fontSize: 13, fontFamily: Fonts.bodyBold, color: Colors.white },
  rejectBtn: {
    flex: 1,
    borderWidth: 1.5,
    borderColor: Colors.border,
    borderRadius: 8,
    paddingVertical: 8,
    alignItems: 'center',
  },
  rejectBtnText: { fontSize: 13, fontFamily: Fonts.bodySemiBold, color: Colors.textMuted },
  expensesBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginTop: 20,
    backgroundColor: Colors.bgCard,
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  expensesBtnText: { flex: 1, fontSize: 15, fontFamily: Fonts.bodySemiBold, color: Colors.ocean },
  joinBtn: {
    marginTop: 24,
    backgroundColor: Colors.primary,
    borderRadius: 14,
    paddingVertical: 15,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  joinBtnText: { fontSize: 16, fontFamily: Fonts.bodyBold, color: Colors.white },
  joinedBadge: {
    marginTop: 20,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: Colors.mist,
    borderRadius: 12,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: Colors.primaryLight,
  },
  joinedText: { fontSize: 14, fontFamily: Fonts.bodySemiBold, color: Colors.forest },
  reviewBtn: {
    marginTop: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    borderWidth: 1.5,
    borderColor: Colors.primaryDark,
    borderRadius: 12,
    paddingVertical: 12,
    backgroundColor: Colors.bgMist,
  },
  reviewBtnText: { fontSize: 14, fontFamily: Fonts.bodySemiBold, color: Colors.primaryDark },
  reviewDoneBadge: {
    marginTop: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  reviewDoneText: { fontSize: 13, fontFamily: Fonts.body, color: Colors.forest },
  emptyCenter: { alignItems: 'center', paddingVertical: 40, gap: 10 },
  emptyText: { fontSize: 15, fontFamily: Fonts.body, color: Colors.textLight },
  // Modal styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.45)',
    justifyContent: 'flex-end',
  },
  modalCard: {
    backgroundColor: Colors.bgCard,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
    paddingBottom: 40,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  modalTitle: { fontSize: 18, fontFamily: Fonts.heading, color: Colors.textDark },
  modalSub: { fontSize: 13, fontFamily: Fonts.body, color: Colors.textMuted, marginBottom: 20 },
  starsRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 10,
    marginBottom: 8,
  },
  ratingLabel: {
    textAlign: 'center',
    fontSize: 14,
    fontFamily: Fonts.bodySemiBold,
    color: Colors.primaryDark,
    marginBottom: 16,
  },
  reviewInput: {
    borderWidth: 1.5,
    borderColor: Colors.border,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 14,
    fontFamily: Fonts.body,
    color: Colors.textDark,
    backgroundColor: Colors.bgInput,
    minHeight: 90,
    textAlignVertical: 'top',
    marginBottom: 20,
  },
  submitReviewBtn: {
    backgroundColor: Colors.primary,
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
  },
  submitReviewBtnDisabled: { opacity: 0.5 },
  submitReviewBtnText: { fontSize: 15, fontFamily: Fonts.bodyBold, color: Colors.white },
  emptySub: { fontSize: 13, fontFamily: Fonts.body, color: Colors.textLight, textAlign: 'center', marginTop: 6 },
  commentCard: {
    backgroundColor: Colors.bgCard,
    borderRadius: 12,
    padding: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  commentHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  commentAuthor: { fontSize: 13, fontFamily: Fonts.bodyBold, color: Colors.textDark },
  commentTime: { fontSize: 12, fontFamily: Fonts.body, color: Colors.textLight },
  commentText: { fontSize: 13, fontFamily: Fonts.body, color: Colors.textMuted, lineHeight: 18 },
  commentInputContainer: { flexDirection: 'row', gap: 8, marginTop: 12, paddingTop: 12, borderTopWidth: 1, borderTopColor: Colors.borderLight },
  commentInput: {
    flex: 1,
    minHeight: 36,
    maxHeight: 80,
    borderWidth: 1.5,
    borderColor: Colors.border,
    borderRadius: 18,
    paddingHorizontal: 14,
    paddingVertical: 8,
    fontSize: 14,
    fontFamily: Fonts.body,
    color: Colors.textDark,
    backgroundColor: Colors.bgInput,
  },
  commentSubmitBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: Colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  commentSubmitBtnDisabled: { opacity: 0.4 },
  boostBtn: {
    backgroundColor: Colors.primary,
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 16,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
    marginTop: 12,
  },
  boostBtnText: {
    fontSize: 14,
    fontFamily: Fonts.bodyBold,
    color: Colors.white,
  },
  boostActiveBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 12,
    paddingVertical: 12,
    paddingHorizontal: 16,
    backgroundColor: Colors.primaryLight,
    borderRadius: 12,
    opacity: 0.2,
  },
  boostActiveText: {
    fontSize: 14,
    fontFamily: Fonts.bodyBold,
    color: Colors.primary,
  },
  boostModalCard: {
    backgroundColor: Colors.white,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
    maxHeight: '80%',
  },
  boostOptions: {
    gap: 12,
    marginVertical: 20,
  },
  boostOption: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: Colors.border,
    borderRadius: 12,
    padding: 16,
    backgroundColor: Colors.bgCard,
  },
  boostOptionActive: {
    borderColor: Colors.primary,
    backgroundColor: Colors.primaryLight,
    opacity: 0.2,
  },
  boostOptionDays: {
    fontSize: 16,
    fontFamily: Fonts.bodyBold,
    color: Colors.textDark,
  },
  boostOptionDaysActive: {
    color: Colors.primary,
  },
  boostOptionReach: {
    fontSize: 12,
    fontFamily: Fonts.body,
    color: Colors.textMuted,
    marginTop: 4,
  },
  boostOptionReachActive: {
    color: Colors.primary,
  },
  boostOptionPrice: {
    fontSize: 18,
    fontFamily: Fonts.heading,
    color: Colors.textDark,
  },
  boostOptionPriceActive: {
    color: Colors.primary,
  },
  boostConfirmBtn: {
    backgroundColor: Colors.primary,
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 16,
    marginBottom: 20,
  },
  boostConfirmBtnText: {
    fontSize: 15,
    fontFamily: Fonts.bodyBold,
    color: Colors.white,
  },
  mapLinkBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 8,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    backgroundColor: Colors.primaryLight,
    opacity: 0.15,
    alignSelf: 'flex-start',
  },
  mapLinkText: {
    fontSize: 13,
    fontFamily: Fonts.bodySemiBold,
    color: Colors.primary,
  },
});