import React, { useState, useEffect, useCallback } from 'react';
import {
  addComment, getComments, deleteComment, toggleReaction, getReactions,
  type CommentItem, type ReactionGroup, type PartnerInfo
} from '../../app/hambaft-api';
import { MessageCircle, X, Check, Send, Trash2 } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

const REACTION_EMOJIS = ['🔥', '👏', '💪', '❤️', '✅', '🎉'];

export default function CommentReactions({ entityType, entityId }: { entityType: string; entityId: string }) {
  const [comments, setComments] = useState<CommentItem[]>([]);
  const [reactions, setReactions] = useState<ReactionGroup[]>([]);
  const [newComment, setNewComment] = useState('');
  const [showComments, setShowComments] = useState(false);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(false);

  const fetchData = useCallback(async () => {
    if (!entityId) return;
    setLoading(true);
    try {
      const [commentsRes, reactionsRes] = await Promise.all([
        getComments(entityType, entityId),
        getReactions(entityType, entityId),
      ]);
      setComments(commentsRes?.data?.comments || []);
      setReactions(reactionsRes?.data?.reactions || []);
    } catch (err) {
      console.error('[hambaft] fetch comments/reactions failed', err);
    } finally {
      setLoading(false);
    }
  }, [entityType, entityId]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const handleAddComment = async () => {
    if (!newComment.trim()) return;
    setSaving(true);
    try {
      await addComment({ entity_type: entityType, entity: entityId, body: newComment.trim() });
      setNewComment('');
      await fetchData();
    } catch (err) {
      console.error('[hambaft] add comment failed', err);
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteComment = async (commentId: string) => {
    try {
      await deleteComment(commentId);
      await fetchData();
    } catch (err) {
      console.error('[hambaft] delete comment failed', err);
    }
  };

  const handleToggleReaction = async (emoji: string) => {
    try {
      await toggleReaction({ entity_type: entityType, entity: entityId, emoji });
      await fetchData();
    } catch (err) {
      console.error('[hambaft] toggle reaction failed', err);
    }
  };

  const totalReactions = reactions.reduce((sum, r) => sum + r.count, 0);

  return (
    <div className="space-y-2">
      {/* Reactions bar */}
      <div className="flex items-center gap-1 flex-wrap">
        {reactions.map(r => (
          <button key={r.emoji} onClick={() => handleToggleReaction(r.emoji)}
            className={`inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full text-[9px] font-bold cursor-pointer transition-all ${
              r.myReaction
                ? 'bg-[#7C8363]/15 text-[#7C8363] border border-[#7C8363]/30'
                : 'bg-[#E6DFD3]/30 text-[#8D7F72] border border-transparent hover:border-[#E6DFD3]/50'
            }`}>
            <span>{r.emoji}</span>
            <span>{r.count}</span>
          </button>
        ))}
        {/* Add reaction picker */}
        <div className="relative group">
          <button className="px-1.5 py-0.5 rounded-full text-[9px] font-bold text-[#8D7F72] cursor-pointer hover:bg-[#E6DFD3]/30 border border-dashed border-[#E6DFD3]/40">
            +😊
          </button>
          <div className="absolute bottom-full right-0 mb-1 hidden group-hover:flex bg-white dark:bg-[#20241A] border border-[#E6DFD3] dark:border-[#3D4133] rounded-xl p-1.5 shadow-lg z-10">
            {REACTION_EMOJIS.map(e => (
              <button key={e} onClick={() => handleToggleReaction(e)}
                className="w-7 h-7 flex items-center justify-center text-sm cursor-pointer hover:bg-[#E6DFD3]/30 rounded-lg transition-colors">
                {e}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Comments toggle */}
      <div className="flex items-center gap-2">
        <button onClick={() => setShowComments(!showComments)}
          className="text-[8px] font-black text-[#7C8363] dark:text-[#9ECE9A] cursor-pointer hover:opacity-80 flex items-center gap-1">
          <MessageCircle className="w-3 h-3" />
          <span>نظرات</span>
          {comments.length > 0 && <span className="bg-[#7C8363]/10 px-1 py-0.5 rounded-full">{comments.length}</span>}
        </button>
        {totalReactions > 0 && (
          <span className="text-[7px] text-[#8D7F72]">{totalReactions} واکنش</span>
        )}
      </div>

      {/* Comments section */}
      <AnimatePresence>
        {showComments && (
          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
            <div className="space-y-2 max-h-60 overflow-y-auto">
              {comments.length > 0 ? comments.map(c => (
                <div key={c.id} className="group flex gap-2 p-2 bg-white dark:bg-[#20241A] border border-[#E6DFD3]/20 rounded-lg text-right">
                  <div className="w-5 h-5 rounded-md bg-slate-100 dark:bg-slate-800 shrink-0 flex items-center justify-center text-[7px]">
                    {c.userInfo.avatarUrl ? <img src={c.userInfo.avatarUrl} alt="" className="w-full h-full object-cover rounded-md" /> : '👤'}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5">
                      <span className="text-[8px] font-black text-[#2D3025] dark:text-[#E8ECE0]">{c.userInfo.fullName}</span>
                      <span className="text-[6px] text-[#8D7F72]">{new Date(c.createdAt).toLocaleDateString('fa-IR')}</span>
                    </div>
                    <p className="text-[8px] text-[#3D3D3D] dark:text-[#D6CFC3] mt-0.5">{c.body}</p>
                  </div>
                  <button onClick={() => handleDeleteComment(c.id)}
                    className="p-0.5 text-[#8D7F72] hover:text-red-400 cursor-pointer opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                    <Trash2 className="w-2.5 h-2.5" />
                  </button>
                </div>
              )) : (
                <p className="text-[8px] text-[#8D7F72] italic">هنوز نظری ثبت نشده.</p>
              )}
            </div>

            {/* Add comment input */}
            <div className="flex items-center gap-1.5 mt-2">
              <input type="text" value={newComment} onChange={e => setNewComment(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleAddComment(); } }}
                placeholder="نظر شما..."
                className="flex-1 text-[9px] font-bold p-2 rounded-lg border border-[#E6DFD3] dark:border-[#3D4133]/50 bg-white dark:bg-[#20241A]" />
              <button onClick={handleAddComment} disabled={!newComment.trim() || saving}
                className="p-2 bg-[#7C8363] dark:bg-[#9ECE9A] text-white dark:text-[#121411] rounded-lg cursor-pointer hover:opacity-90 disabled:opacity-40">
                <Send className="w-3 h-3" />
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
