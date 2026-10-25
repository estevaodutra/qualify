import { supabase } from "@/integrations/supabase/client";
import {
  SprintBoard,
  SprintList,
  SprintCard,
  SprintLabel,
  SprintChecklist,
  SprintChecklistItem,
  SprintComment,
  SprintActivity,
} from "../types";

export const sprintService = {
  // --- BOARDS ---
  async getBoards(companyId: string): Promise<SprintBoard[]> {
    const { data, error } = await (supabase as any)
      .from("sprint_boards")
      .select("*")
      .eq("company_id", companyId)
      .is("archived_at", null)
      .order("created_at", { ascending: false });

    if (error) throw error;
    return (data || []) as SprintBoard[];
  },

  async createBoard(params: {
    companyId: string;
    title: string;
    description?: string;
    background_value?: string;
    userId?: string;
  }): Promise<SprintBoard> {
    const { data, error } = await (supabase as any)
      .from("sprint_boards")
      .insert({
        company_id: params.companyId,
        title: params.title,
        description: params.description || "",
        background_value: params.background_value || "#0F172A",
        created_by: params.userId,
      })
      .select()
      .single();

    if (error) throw error;
    const board = data as SprintBoard;

    // Criar listas padrão do Trello automaticamente para comodidade
    const defaultLists = ["A Fazer", "Em Andamento", "Concluído"];
    for (let i = 0; i < defaultLists.length; i++) {
      await (supabase as any).from("sprint_lists").insert({
        board_id: board.id,
        company_id: params.companyId,
        title: defaultLists[i],
        position: (i + 1) * 1000,
      });
    }

    // Criar etiquetas padrão
    const defaultLabels = [
      { name: "Prioridade Alta", color: "#EF4444" },
      { name: "Em Revisão", color: "#F59E0B" },
      { name: "Design", color: "#8B5CF6" },
      { name: "Dev", color: "#3B82F6" },
      { name: "Concluído", color: "#10B981" },
    ];
    for (const label of defaultLabels) {
      await (supabase as any).from("sprint_labels").insert({
        board_id: board.id,
        company_id: params.companyId,
        name: label.name,
        color: label.color,
      });
    }

    return board;
  },

  async updateBoard(boardId: string, updates: Partial<SprintBoard>): Promise<SprintBoard> {
    const { data, error } = await (supabase as any)
      .from("sprint_boards")
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq("id", boardId)
      .select()
      .single();

    if (error) throw error;
    return data as SprintBoard;
  },

  async deleteBoard(boardId: string): Promise<void> {
    const { error } = await (supabase as any)
      .from("sprint_boards")
      .delete()
      .eq("id", boardId);

    if (error) throw error;
  },

  // --- FULL BOARD DATA (Lists, Cards, Labels, Checklists, Members) ---
  async getBoardDetails(boardId: string): Promise<{
    board: SprintBoard;
    lists: SprintList[];
    labels: SprintLabel[];
  }> {
    // 1. Board
    const { data: boardData, error: boardError } = await (supabase as any)
      .from("sprint_boards")
      .select("*")
      .eq("id", boardId)
      .single();

    if (boardError) throw boardError;

    // 2. Lists
    const { data: listsData, error: listsError } = await (supabase as any)
      .from("sprint_lists")
      .select("*")
      .eq("board_id", boardId)
      .is("archived_at", null)
      .order("position", { ascending: true });

    if (listsError) throw listsError;

    // 3. Cards
    const { data: cardsData, error: cardsError } = await (supabase as any)
      .from("sprint_cards")
      .select("*")
      .eq("board_id", boardId)
      .is("archived_at", null)
      .order("position", { ascending: true });

    if (cardsError) throw cardsError;

    // 4. Labels
    const { data: labelsData } = await (supabase as any)
      .from("sprint_labels")
      .select("*")
      .eq("board_id", boardId);

    const labels = (labelsData || []) as SprintLabel[];

    // 5. Card relations (labels, members, checklists, comments)
    const cardIds = (cardsData || []).map((c: any) => c.id);

    let cardLabelsMap: Record<string, SprintLabel[]> = {};
    let cardMembersMap: Record<string, any[]> = {};
    let cardChecklistsMap: Record<string, SprintChecklist[]> = {};
    let cardCommentsCountMap: Record<string, number> = {};

    if (cardIds.length > 0) {
      // Labels on cards
      const { data: clData } = await (supabase as any)
        .from("sprint_card_labels")
        .select("card_id, label_id")
        .in("card_id", cardIds);

      if (clData) {
        clData.forEach((rel: any) => {
          const foundLabel = labels.find((l) => l.id === rel.label_id);
          if (foundLabel) {
            if (!cardLabelsMap[rel.card_id]) cardLabelsMap[rel.card_id] = [];
            cardLabelsMap[rel.card_id].push(foundLabel);
          }
        });
      }

      // Members on cards
      const { data: cmData } = await (supabase as any)
        .from("sprint_card_members")
        .select("card_id, user_id")
        .in("card_id", cardIds);

      if (cmData) {
        cmData.forEach((rel: any) => {
          if (!cardMembersMap[rel.card_id]) cardMembersMap[rel.card_id] = [];
          cardMembersMap[rel.card_id].push({ user_id: rel.user_id });
        });
      }

      // Checklists
      const { data: chkData } = await (supabase as any)
        .from("sprint_checklists")
        .select("*, items:sprint_checklist_items(*)")
        .in("card_id", cardIds)
        .order("position", { ascending: true });

      if (chkData) {
        chkData.forEach((chk: any) => {
          if (!cardChecklistsMap[chk.card_id]) cardChecklistsMap[chk.card_id] = [];
          cardChecklistsMap[chk.card_id].push({
            ...chk,
            items: chk.items ? chk.items.sort((a: any, b: any) => a.position - b.position) : [],
          });
        });
      }

      // Comments counts
      const { data: commentsData } = await (supabase as any)
        .from("sprint_card_comments")
        .select("id, card_id")
        .in("card_id", cardIds);

      if (commentsData) {
        commentsData.forEach((comment: any) => {
          cardCommentsCountMap[comment.card_id] = (cardCommentsCountMap[comment.card_id] || 0) + 1;
        });
      }
    }

    // Assemble cards inside lists
    const enrichedCards: SprintCard[] = (cardsData || []).map((card: any) => ({
      ...card,
      labels: cardLabelsMap[card.id] || [],
      members: cardMembersMap[card.id] || [],
      checklists: cardChecklistsMap[card.id] || [],
      comments_count: cardCommentsCountMap[card.id] || 0,
    }));

    const lists: SprintList[] = (listsData || []).map((list: any) => ({
      ...list,
      cards: enrichedCards.filter((c) => c.list_id === list.id),
    }));

    return {
      board: boardData as SprintBoard,
      lists,
      labels,
    };
  },

  // --- LISTS ---
  async createList(params: {
    boardId: string;
    companyId: string;
    title: string;
    position: number;
  }): Promise<SprintList> {
    const { data, error } = await (supabase as any)
      .from("sprint_lists")
      .insert({
        board_id: params.boardId,
        company_id: params.companyId,
        title: params.title,
        position: params.position,
      })
      .select()
      .single();

    if (error) throw error;
    return { ...data, cards: [] } as SprintList;
  },

  async updateList(listId: string, updates: Partial<SprintList>): Promise<void> {
    const { error } = await (supabase as any)
      .from("sprint_lists")
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq("id", listId);

    if (error) throw error;
  },

  async archiveList(listId: string): Promise<void> {
    const { error } = await (supabase as any)
      .from("sprint_lists")
      .update({ archived_at: new Date().toISOString() })
      .eq("id", listId);

    if (error) throw error;
  },

  // --- CARDS ---
  async createCard(params: {
    listId: string;
    boardId: string;
    companyId: string;
    title: string;
    position: number;
    userId?: string;
  }): Promise<SprintCard> {
    const { data, error } = await (supabase as any)
      .from("sprint_cards")
      .insert({
        list_id: params.listId,
        board_id: params.boardId,
        company_id: params.companyId,
        title: params.title,
        position: params.position,
        created_by: params.userId,
      })
      .select()
      .single();

    if (error) throw error;
    return {
      ...data,
      labels: [],
      members: [],
      checklists: [],
      comments_count: 0,
    } as SprintCard;
  },

  async updateCard(cardId: string, updates: Partial<SprintCard>): Promise<void> {
    const cleanUpdates = { ...updates };
    delete (cleanUpdates as any).labels;
    delete (cleanUpdates as any).members;
    delete (cleanUpdates as any).checklists;
    delete (cleanUpdates as any).comments_count;

    const { error } = await (supabase as any)
      .from("sprint_cards")
      .update({ ...cleanUpdates, updated_at: new Date().toISOString() })
      .eq("id", cardId);

    if (error) throw error;
  },

  async moveCard(params: {
    cardId: string;
    targetListId: string;
    newPosition: number;
  }): Promise<void> {
    const { error } = await (supabase as any)
      .from("sprint_cards")
      .update({
        list_id: params.targetListId,
        position: params.newPosition,
        updated_at: new Date().toISOString(),
      })
      .eq("id", params.cardId);

    if (error) throw error;
  },

  async archiveCard(cardId: string): Promise<void> {
    const { error } = await (supabase as any)
      .from("sprint_cards")
      .update({ archived_at: new Date().toISOString() })
      .eq("id", cardId);

    if (error) throw error;
  },

  async deleteCard(cardId: string): Promise<void> {
    const { error } = await (supabase as any)
      .from("sprint_cards")
      .delete()
      .eq("id", cardId);

    if (error) throw error;
  },

  // --- CARD LABELS & MEMBERS ---
  async toggleCardLabel(cardId: string, labelId: string): Promise<boolean> {
    // Check if relation exists
    const { data } = await (supabase as any)
      .from("sprint_card_labels")
      .select("id")
      .eq("card_id", cardId)
      .eq("label_id", labelId)
      .maybeSingle();

    if (data) {
      await (supabase as any)
        .from("sprint_card_labels")
        .delete()
        .eq("card_id", cardId)
        .eq("label_id", labelId);
      return false; // Removed
    } else {
      await (supabase as any)
        .from("sprint_card_labels")
        .insert({ card_id: cardId, label_id: labelId });
      return true; // Added
    }
  },

  async toggleCardMember(cardId: string, userId: string, assignedBy?: string): Promise<boolean> {
    const { data } = await (supabase as any)
      .from("sprint_card_members")
      .select("id")
      .eq("card_id", cardId)
      .eq("user_id", userId)
      .maybeSingle();

    if (data) {
      await (supabase as any)
        .from("sprint_card_members")
        .delete()
        .eq("card_id", cardId)
        .eq("user_id", userId);
      return false; // Removed
    } else {
      await (supabase as any)
        .from("sprint_card_members")
        .insert({ card_id: cardId, user_id: userId, assigned_by: assignedBy });
      return true; // Added
    }
  },

  async addCardMember(cardId: string, userId: string, assignedBy?: string): Promise<void> {
    const { data } = await (supabase as any)
      .from("sprint_card_members")
      .select("id")
      .eq("card_id", cardId)
      .eq("user_id", userId)
      .maybeSingle();

    if (!data) {
      await (supabase as any)
        .from("sprint_card_members")
        .insert({ card_id: cardId, user_id: userId, assigned_by: assignedBy });
    }
  },

  // --- CHECKLISTS ---
  async createChecklist(cardId: string, title = "Checklist", position = 1000): Promise<SprintChecklist> {
    const { data, error } = await (supabase as any)
      .from("sprint_checklists")
      .insert({ card_id: cardId, title, position })
      .select()
      .single();

    if (error) throw error;
    return { ...data, items: [] } as SprintChecklist;
  },

  async deleteChecklist(checklistId: string): Promise<void> {
    const { error } = await (supabase as any)
      .from("sprint_checklists")
      .delete()
      .eq("id", checklistId);

    if (error) throw error;
  },

  async createChecklistItem(params: {
    checklistId: string;
    cardId: string;
    title: string;
    position: number;
    assignedUserId?: string;
  }): Promise<SprintChecklistItem> {
    const { data, error } = await (supabase as any)
      .from("sprint_checklist_items")
      .insert({
        checklist_id: params.checklistId,
        card_id: params.cardId,
        title: params.title,
        position: params.position,
        assigned_user_id: params.assignedUserId || null,
      })
      .select()
      .single();

    if (error) throw error;
    return data as SprintChecklistItem;
  },

  async updateChecklistItem(itemId: string, updates: Partial<SprintChecklistItem>): Promise<void> {
    const { error } = await (supabase as any)
      .from("sprint_checklist_items")
      .update(updates)
      .eq("id", itemId);

    if (error) throw error;
  },

  async deleteChecklistItem(itemId: string): Promise<void> {
    const { error } = await (supabase as any)
      .from("sprint_checklist_items")
      .delete()
      .eq("id", itemId);

    if (error) throw error;
  },

  // --- COMMENTS ---
  async getCardComments(cardId: string): Promise<SprintComment[]> {
    const { data, error } = await (supabase as any)
      .from("sprint_card_comments")
      .select("*")
      .eq("card_id", cardId)
      .order("created_at", { ascending: true });

    if (error) throw error;
    return (data || []) as SprintComment[];
  },

  async addCardComment(params: {
    cardId: string;
    userId: string;
    content: string;
  }): Promise<SprintComment> {
    const { data, error } = await (supabase as any)
      .from("sprint_card_comments")
      .insert({
        card_id: params.cardId,
        user_id: params.userId,
        content: params.content,
      })
      .select()
      .single();

    if (error) throw error;
    return data as SprintComment;
  },

  async deleteCardComment(commentId: string): Promise<void> {
    const { error } = await (supabase as any)
      .from("sprint_card_comments")
      .delete()
      .eq("id", commentId);

    if (error) throw error;
  },

  // --- MENTIONS (@) ---
  async recordMention(params: {
    companyId: string;
    boardId: string;
    cardId: string;
    checklist_item_id?: string;
    comment_id?: string;
    mentionedUserId: string;
    createdBy?: string;
  }): Promise<void> {
    await (supabase as any).from("sprint_mentions").insert({
      company_id: params.companyId,
      board_id: params.boardId,
      card_id: params.cardId,
      checklist_item_id: params.checklist_item_id || null,
      comment_id: params.comment_id || null,
      mentioned_user_id: params.mentionedUserId,
      created_by: params.createdBy || null,
    });
  },

  // --- ACTIVITIES ---
  async logActivity(params: {
    boardId: string;
    cardId?: string;
    userId?: string;
    actionType: string;
    details?: Record<string, any>;
  }): Promise<void> {
    try {
      await (supabase as any).from("sprint_activities").insert({
        board_id: params.boardId,
        card_id: params.cardId || null,
        user_id: params.userId || null,
        action_type: params.actionType,
        details: params.details || {},
      });
    } catch (e) {
      console.warn("Failed to log activity", e);
    }
  },

  async getBoardActivities(boardId: string): Promise<SprintActivity[]> {
    const { data, error } = await (supabase as any)
      .from("sprint_activities")
      .select("*")
      .eq("board_id", boardId)
      .order("created_at", { ascending: false })
      .limit(50);

    if (error) return [];
    return data as SprintActivity[];
  },
};
