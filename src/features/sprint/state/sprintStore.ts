import { create } from "zustand";
import {
  SprintBoard,
  SprintList,
  SprintCard,
  SprintLabel,
  SprintChecklist,
  SprintChecklistItem,
  SprintComment,
  SprintAttachment,
} from "../types";
import { sprintService } from "../services/sprintService";
import { uploadSprintFile } from "../utils/sprintFileUtils";
import { toast } from "sonner";

interface SprintState {
  boards: SprintBoard[];
  currentBoard: SprintBoard | null;
  lists: SprintList[];
  labels: SprintLabel[];
  activeCardId: string | null;
  activeCard: SprintCard | null;
  cardComments: SprintComment[];
  boardAttachments: SprintAttachment[];
  cardAttachments: SprintAttachment[];
  isLoading: boolean;
  searchFilter: string;
  selectedLabelFilters: string[];
  selectedMemberFilters: string[];

  // Actions
  setSearchFilter: (query: string) => void;
  toggleLabelFilter: (labelId: string) => void;
  toggleMemberFilter: (userId: string) => void;
  clearFilters: () => void;

  loadBoards: (companyId: string) => Promise<void>;
  createBoard: (params: {
    companyId: string;
    title: string;
    description?: string;
    background_value?: string;
    userId?: string;
  }) => Promise<SprintBoard>;
  updateBoard: (boardId: string, updates: Partial<SprintBoard>) => Promise<void>;
  deleteBoard: (boardId: string) => Promise<void>;

  loadBoardDetails: (boardId: string) => Promise<void>;

  // Lists
  createList: (params: { boardId: string; companyId: string; title: string }) => Promise<void>;
  updateListTitle: (listId: string, title: string) => Promise<void>;
  archiveList: (listId: string) => Promise<void>;
  reorderLists: (reorderedLists: SprintList[]) => Promise<void>;

  // Cards
  createCard: (params: {
    listId: string;
    boardId: string;
    companyId: string;
    title: string;
    userId?: string;
  }) => Promise<SprintCard>;
  updateCard: (cardId: string, updates: Partial<SprintCard>) => Promise<void>;
  archiveCard: (cardId: string) => Promise<void>;
  moveCard: (params: {
    cardId: string;
    sourceListId: string;
    targetListId: string;
    newIndex: number;
  }) => Promise<void>;

  // Card Modal
  openCardModal: (cardId: string) => Promise<void> | void;
  closeCardModal: () => void;
  loadCardComments: (cardId: string) => Promise<void>;
  loadBoardAttachments: (boardId: string) => Promise<void>;
  loadCardAttachments: (cardId: string) => Promise<void>;
  uploadChecklistItemAttachment: (params: {
    checklistId: string;
    itemId: string;
    cardId: string;
    boardId: string;
    companyId: string;
    file: File;
    userId: string;
  }) => Promise<void>;
  removeChecklistItemAttachment: (params: {
    checklistId: string;
    itemId: string;
    cardId: string;
  }) => Promise<void>;
  addComment: (params: {
    cardId: string;
    userId: string;
    content: string;
    boardId?: string;
    companyId?: string;
    file?: File | null;
  }) => Promise<void>;
  deleteComment: (commentId: string) => Promise<void>;

  // Checklists
  addChecklist: (cardId: string, title: string) => Promise<void>;
  updateChecklistTitle: (checklistId: string, title: string) => Promise<void>;
  deleteChecklist: (checklistId: string) => Promise<void>;
  addChecklistItem: (params: {
    checklistId: string;
    cardId: string;
    title: string;
    assignedUserId?: string;
  }) => Promise<void>;
  toggleChecklistItem: (checklistId: string, itemId: string) => Promise<void>;
  updateChecklistItemTitle: (checklistId: string, itemId: string, title: string) => Promise<void>;
  updateChecklistItemNotes: (checklistId: string, itemId: string, notes: string | null) => Promise<void>;
  addChecklistItemComment: (checklistId: string, itemId: string, cardId: string, content: string) => Promise<void>;
  deleteChecklistItemComment: (checklistId: string, itemId: string, commentId: string) => Promise<void>;
  deleteChecklistItem: (checklistId: string, itemId: string) => Promise<void>;
  reorderChecklists: (cardId: string, newChecklists: SprintChecklist[]) => Promise<void>;
  reorderChecklistItems: (checklistId: string, newItems: SprintChecklistItem[]) => Promise<void>;
  moveChecklistItemBetweenChecklists: (
    srcChecklistId: string,
    tgtChecklistId: string,
    srcItems: SprintChecklistItem[],
    tgtItems: SprintChecklistItem[],
    itemId: string
  ) => Promise<void>;

  // Labels & Members
  toggleCardLabel: (cardId: string, label: SprintLabel) => Promise<void>;
  toggleCardMember: (cardId: string, member: { user_id: string; email?: string; full_name?: string }) => Promise<void>;
  autoAssignMemberMention: (cardId: string, member: { user_id: string; email?: string; full_name?: string }) => Promise<void>;
}

export const useSprintStore = create<SprintState>((set, get) => ({
  boards: [],
  currentBoard: null,
  lists: [],
  labels: [],
  activeCardId: null,
  activeCard: null,
  cardComments: [],
  boardAttachments: [],
  cardAttachments: [],
  isLoading: false,
  searchFilter: "",
  selectedLabelFilters: [],
  selectedMemberFilters: [],

  setSearchFilter: (query: string) => set({ searchFilter: query }),

  toggleLabelFilter: (labelId: string) => {
    const current = get().selectedLabelFilters;
    set({
      selectedLabelFilters: current.includes(labelId)
        ? current.filter((id) => id !== labelId)
        : [...current, labelId],
    });
  },

  toggleMemberFilter: (userId: string) => {
    const current = get().selectedMemberFilters;
    set({
      selectedMemberFilters: current.includes(userId)
        ? current.filter((id) => id !== userId)
        : [...current, userId],
    });
  },

  clearFilters: () => set({ searchFilter: "", selectedLabelFilters: [], selectedMemberFilters: [] }),

  loadBoards: async (companyId: string) => {
    try {
      set({ isLoading: true });
      const boards = await sprintService.getBoards(companyId);
      set({ boards });
    } catch (err: any) {
      console.error("Error loading boards:", err);
      toast.error("Erro ao carregar quadros do Sprint");
    } finally {
      set({ isLoading: false });
    }
  },

  createBoard: async (params) => {
    const newBoard = await sprintService.createBoard(params);
    set((state) => ({ boards: [newBoard, ...state.boards] }));
    toast.success("Quadro criado com sucesso!");
    return newBoard;
  },

  updateBoard: async (boardId: string, updates: Partial<SprintBoard>) => {
    set((state) => ({
      boards: state.boards.map((b) => (b.id === boardId ? { ...b, ...updates } : b)),
      currentBoard:
        state.currentBoard?.id === boardId
          ? { ...state.currentBoard, ...updates }
          : state.currentBoard,
    }));
    await sprintService.updateBoard(boardId, updates);
  },

  deleteBoard: async (boardId: string) => {
    await sprintService.deleteBoard(boardId);
    set((state) => ({
      boards: state.boards.filter((b) => b.id !== boardId),
      currentBoard: state.currentBoard?.id === boardId ? null : state.currentBoard,
    }));
    toast.success("Quadro excluído!");
  },

  loadBoardDetails: async (boardId: string) => {
    try {
      set({ isLoading: true });
      const { board, lists, labels } = await sprintService.getBoardDetails(boardId);
      set({ currentBoard: board, lists, labels });
      get().loadBoardAttachments(boardId);
    } catch (err: any) {
      console.error("Error loading board details:", err);
      toast.error("Erro ao carregar detalhes do quadro");
    } finally {
      set({ isLoading: false });
    }
  },

  createList: async ({ boardId, companyId, title }) => {
    const { lists } = get();
    const lastPos = lists.length > 0 ? lists[lists.length - 1].position : 0;
    const newPos = lastPos + 1000;

    const createdList = await sprintService.createList({
      boardId,
      companyId,
      title,
      position: newPos,
    });

    set({ lists: [...lists, createdList] });
    toast.success("Lista criada!");
  },

  updateListTitle: async (listId, title) => {
    set((state) => ({
      lists: state.lists.map((l) => (l.id === listId ? { ...l, title } : l)),
    }));
    await sprintService.updateList(listId, { title });
  },

  archiveList: async (listId) => {
    set((state) => ({
      lists: state.lists.filter((l) => l.id !== listId),
    }));
    await sprintService.archiveList(listId);
    toast.success("Lista arquivada!");
  },

  reorderLists: async (reorderedLists) => {
    set({ lists: reorderedLists });
    // Salvar posições das listas
    for (let i = 0; i < reorderedLists.length; i++) {
      const list = reorderedLists[i];
      const newPos = (i + 1) * 1000;
      sprintService.updateList(list.id, { position: newPos });
    }
  },

  createCard: async ({ listId, boardId, companyId, title, userId }) => {
    const { lists } = get();
    const targetList = lists.find((l) => l.id === listId);
    const lastPos =
      targetList && targetList.cards.length > 0
        ? targetList.cards[targetList.cards.length - 1].position
        : 0;
    const newPos = lastPos + 1000;

    const newCard = await sprintService.createCard({
      listId,
      boardId,
      companyId,
      title,
      position: newPos,
      userId,
    });

    set((state) => ({
      lists: state.lists.map((l) =>
        l.id === listId ? { ...l, cards: [...l.cards, newCard] } : l
      ),
    }));

    return newCard;
  },

  updateCard: async (cardId, updates) => {
    set((state) => {
      const updateCardInList = (cards: SprintCard[]) =>
        cards.map((c) => (c.id === cardId ? { ...c, ...updates } : c));

      const updatedLists = state.lists.map((l) => ({
        ...l,
        cards: updateCardInList(l.cards),
      }));

      const updatedActiveCard =
        state.activeCard?.id === cardId ? { ...state.activeCard, ...updates } : state.activeCard;

      return { lists: updatedLists, activeCard: updatedActiveCard };
    });

    await sprintService.updateCard(cardId, updates);
  },

  archiveCard: async (cardId) => {
    set((state) => ({
      lists: state.lists.map((l) => ({
        ...l,
        cards: l.cards.filter((c) => c.id !== cardId),
      })),
      activeCardId: state.activeCardId === cardId ? null : state.activeCardId,
      activeCard: state.activeCard?.id === cardId ? null : state.activeCard,
    }));
    await sprintService.archiveCard(cardId);
    toast.success("Cartão arquivado!");
  },

  moveCard: async ({ cardId, sourceListId, targetListId, newIndex }) => {
    const { lists } = get();
    const src = lists.find((l) => l.id === sourceListId);
    const tgt = lists.find((l) => l.id === targetListId);
    if (!src || !tgt) return;

    const card = src.cards.find((c) => c.id === cardId);
    if (!card) return;

    // Calcular nova posição
    const targetCards = [...tgt.cards.filter((c) => c.id !== cardId)];
    targetCards.splice(newIndex, 0, { ...card, list_id: targetListId });

    let calculatedPos = 1000;
    if (targetCards.length === 1) {
      calculatedPos = 1000;
    } else if (newIndex === 0) {
      calculatedPos = targetCards[1].position / 2;
    } else if (newIndex === targetCards.length - 1) {
      calculatedPos = targetCards[targetCards.length - 2].position + 1000;
    } else {
      const prevPos = targetCards[newIndex - 1].position;
      const nextPos = targetCards[newIndex + 1].position;
      calculatedPos = (prevPos + nextPos) / 2;
    }

    // Atualização otimista
    set((state) => ({
      lists: state.lists.map((l) => {
        if (l.id === sourceListId && sourceListId === targetListId) {
          return {
            ...l,
            cards: targetCards.map((c) => (c.id === cardId ? { ...c, position: calculatedPos } : c)),
          };
        }
        if (l.id === sourceListId) {
          return { ...l, cards: l.cards.filter((c) => c.id !== cardId) };
        }
        if (l.id === targetListId) {
          return {
            ...l,
            cards: targetCards.map((c) => (c.id === cardId ? { ...c, position: calculatedPos } : c)),
          };
        }
        return l;
      }),
    }));

    await sprintService.moveCard({
      cardId,
      targetListId,
      newPosition: calculatedPos,
    });
  },

  openCardModal: async (cardId: string) => {
    const { lists } = get();
    for (const list of lists) {
      const found = list.cards.find((c) => c.id === cardId);
      if (found) {
        set({ activeCardId: cardId, activeCard: found });
        get().loadCardComments(cardId);
        get().loadCardAttachments(cardId);
        return;
      }
    }

    try {
      const card = await sprintService.getCardById(cardId);
      if (card) {
        set({ activeCardId: cardId, activeCard: card });
        get().loadCardComments(cardId);
        get().loadCardAttachments(cardId);
      }
    } catch (e) {
      console.warn("Failed to load card for modal", e);
    }
  },

  closeCardModal: () => {
    set({ activeCardId: null, activeCard: null, cardComments: [], cardAttachments: [] });
  },

  loadCardComments: async (cardId: string) => {
    try {
      const comments = await sprintService.getCardComments(cardId);
      set({ cardComments: comments });
    } catch (e) {
      console.warn("Failed to load comments", e);
    }
  },

  loadBoardAttachments: async (boardId: string) => {
    try {
      const attachments = await sprintService.getBoardAttachments(boardId);
      set({ boardAttachments: attachments });
    } catch (e) {
      console.warn("Failed to load board attachments", e);
    }
  },

  loadCardAttachments: async (cardId: string) => {
    try {
      const attachments = await sprintService.getCardAttachments(cardId);
      set({ cardAttachments: attachments });
    } catch (e) {
      console.warn("Failed to load card attachments", e);
    }
  },

  uploadChecklistItemAttachment: async ({ checklistId, itemId, cardId, boardId, companyId, file, userId }) => {
    try {
      const uploaded = await uploadSprintFile(file, userId, boardId);
      await sprintService.updateChecklistItemAttachment({
        itemId,
        cardId,
        boardId,
        companyId,
        attachment: {
          url: uploaded.url,
          name: uploaded.fileName,
          size: uploaded.fileSize,
          type: uploaded.fileType,
          storagePath: uploaded.storagePath,
          userId,
        },
      });

      const updateItemInCard = (c: SprintCard): SprintCard => ({
        ...c,
        checklists: (c.checklists || []).map((ch) =>
          ch.id === checklistId
            ? {
                ...ch,
                items: (ch.items || []).map((it) =>
                  it.id === itemId
                    ? {
                        ...it,
                        attachment_url: uploaded.url,
                        attachment_name: uploaded.fileName,
                        attachment_size: uploaded.fileSize,
                        attachment_type: uploaded.fileType,
                      }
                    : it
                ),
              }
            : ch
        ),
      });

      const newAttachment: SprintAttachment = {
        id: `item-${itemId}`,
        company_id: companyId,
        board_id: boardId,
        card_id: cardId,
        checklist_item_id: itemId,
        file_name: uploaded.fileName,
        file_url: uploaded.url,
        file_size: uploaded.fileSize,
        file_type: uploaded.fileType,
        storage_path: uploaded.storagePath,
        uploaded_by: userId,
        created_at: new Date().toISOString(),
        card_title: get().activeCard?.title,
      };

      set((state) => ({
        lists: state.lists.map((l) => ({
          ...l,
          cards: l.cards.map((c) =>
            (c.checklists || []).some((ch) => ch.id === checklistId) ? updateItemInCard(c) : c
          ),
        })),
        activeCard: state.activeCard ? updateItemInCard(state.activeCard) : null,
        boardAttachments: [
          newAttachment,
          ...(state.boardAttachments || []).filter((a) => a.checklist_item_id !== itemId),
        ],
        cardAttachments: [
          newAttachment,
          ...(state.cardAttachments || []).filter((a) => a.checklist_item_id !== itemId),
        ],
      }));

      toast.success("Arquivo anexado com sucesso!");
    } catch (err: any) {
      console.error("Erro no upload do anexo:", err);
      toast.error(err.message || "Erro ao anexar arquivo");
      throw err;
    }
  },

  removeChecklistItemAttachment: async ({ checklistId, itemId, cardId }) => {
    try {
      await sprintService.updateChecklistItemAttachment({
        itemId,
        cardId,
        boardId: "",
        companyId: "",
        attachment: null,
      });

      const updateItemInCard = (c: SprintCard): SprintCard => ({
        ...c,
        checklists: (c.checklists || []).map((ch) =>
          ch.id === checklistId
            ? {
                ...ch,
                items: (ch.items || []).map((it) =>
                  it.id === itemId
                    ? {
                        ...it,
                        attachment_url: null,
                        attachment_name: null,
                        attachment_size: null,
                        attachment_type: null,
                      }
                    : it
                ),
              }
            : ch
        ),
      });

      set((state) => ({
        lists: state.lists.map((l) => ({
          ...l,
          cards: l.cards.map((c) =>
            (c.checklists || []).some((ch) => ch.id === checklistId) ? updateItemInCard(c) : c
          ),
        })),
        activeCard: state.activeCard ? updateItemInCard(state.activeCard) : null,
        boardAttachments: (state.boardAttachments || []).filter(
          (a) => a.checklist_item_id !== itemId
        ),
        cardAttachments: (state.cardAttachments || []).filter(
          (a) => a.checklist_item_id !== itemId
        ),
      }));

      toast.success("Anexo removido");
    } catch (err: any) {
      toast.error("Erro ao remover anexo");
    }
  },

  addComment: async ({ cardId, userId, content, boardId, companyId, file }) => {
    let attachmentPayload: any = null;
    if (file) {
      const bId = boardId || get().currentBoard?.id;
      if (bId) {
        const uploaded = await uploadSprintFile(file, userId, bId);
        attachmentPayload = {
          url: uploaded.url,
          name: uploaded.fileName,
          size: uploaded.fileSize,
          type: uploaded.fileType,
          storagePath: uploaded.storagePath,
        };
      }
    }

    const newComment = await sprintService.addCardComment({
      cardId,
      userId,
      content,
      boardId: boardId || get().currentBoard?.id,
      companyId: companyId || get().currentBoard?.company_id,
      attachment: attachmentPayload,
    });

    set((state) => {
      const newAttachment: SprintAttachment | null = attachmentPayload && newComment?.id
        ? {
            id: `comment-${newComment.id}`,
            company_id: companyId || state.currentBoard?.company_id || "",
            board_id: boardId || state.currentBoard?.id || "",
            card_id: cardId,
            comment_id: newComment.id,
            file_name: attachmentPayload.name,
            file_url: attachmentPayload.url,
            file_size: attachmentPayload.size,
            file_type: attachmentPayload.type,
            storage_path: attachmentPayload.storagePath,
            uploaded_by: userId,
            created_at: newComment.created_at || new Date().toISOString(),
            card_title: state.activeCard?.title,
          }
        : null;

      return {
        cardComments: [...state.cardComments, newComment],
        lists: state.lists.map((l) => ({
          ...l,
          cards: l.cards.map((c) =>
            c.id === cardId ? { ...c, comments_count: (c.comments_count || 0) + 1 } : c
          ),
        })),
        activeCard:
          state.activeCard?.id === cardId
            ? { ...state.activeCard, comments_count: (state.activeCard.comments_count || 0) + 1 }
            : state.activeCard,
        boardAttachments: newAttachment
          ? [newAttachment, ...(state.boardAttachments || [])]
          : state.boardAttachments,
        cardAttachments: newAttachment
          ? [newAttachment, ...(state.cardAttachments || [])]
          : state.cardAttachments,
      };
    });
  },

  deleteComment: async (commentId: string) => {
    await sprintService.deleteCardComment(commentId);
    set((state) => ({
      cardComments: state.cardComments.filter((c) => c.id !== commentId),
    }));
  },

  addChecklist: async (cardId, title) => {
    const newChk = await sprintService.createChecklist(cardId, title);
    set((state) => {
      const updateCardChecklists = (c: SprintCard) =>
        c.id === cardId ? { ...c, checklists: [...(c.checklists || []), newChk] } : c;

      return {
        lists: state.lists.map((l) => ({ ...l, cards: l.cards.map(updateCardChecklists) })),
        activeCard: state.activeCard?.id === cardId ? updateCardChecklists(state.activeCard) : state.activeCard,
      };
    });
  },

  updateChecklistTitle: async (checklistId, title) => {
    set((state) => {
      const updateChk = (c: SprintCard) => ({
        ...c,
        checklists: (c.checklists || []).map((ch) =>
          ch.id === checklistId ? { ...ch, title } : ch
        ),
      });

      return {
        lists: state.lists.map((l) => ({ ...l, cards: l.cards.map(updateChk) })),
        activeCard: state.activeCard ? updateChk(state.activeCard) : null,
      };
    });

    await sprintService.updateChecklist(checklistId, { title });
  },

  deleteChecklist: async (checklistId) => {
    await sprintService.deleteChecklist(checklistId);
    set((state) => {
      const removeChk = (c: SprintCard) => ({
        ...c,
        checklists: (c.checklists || []).filter((ch) => ch.id !== checklistId),
      });

      return {
        lists: state.lists.map((l) => ({ ...l, cards: l.cards.map(removeChk) })),
        activeCard: state.activeCard ? removeChk(state.activeCard) : null,
      };
    });
  },

  addChecklistItem: async ({ checklistId, cardId, title, assignedUserId }) => {
    const newItem = await sprintService.createChecklistItem({
      checklistId,
      cardId,
      title,
      position: 1000,
      assignedUserId,
    });

    set((state) => {
      const updateItemInCard = (c: SprintCard) => {
        if (c.id !== cardId) return c;
        return {
          ...c,
          checklists: (c.checklists || []).map((ch) =>
            ch.id === checklistId ? { ...ch, items: [...ch.items, newItem] } : ch
          ),
        };
      };

      return {
        lists: state.lists.map((l) => ({ ...l, cards: l.cards.map(updateItemInCard) })),
        activeCard: state.activeCard?.id === cardId ? updateItemInCard(state.activeCard) : state.activeCard,
      };
    });
  },

  updateChecklistItemTitle: async (checklistId, itemId, title) => {
    set((state) => {
      const updateItemInCard = (c: SprintCard) => ({
        ...c,
        checklists: (c.checklists || []).map((ch) =>
          ch.id === checklistId
            ? {
                ...ch,
                items: (ch.items || []).map((it) =>
                  it.id === itemId ? { ...it, title } : it
                ),
              }
            : ch
        ),
      });

      return {
        lists: state.lists.map((l) => ({
          ...l,
          cards: l.cards.map((c) =>
            (c.checklists || []).some((ch) => ch.id === checklistId)
              ? updateItemInCard(c)
              : c
          ),
        })),
        activeCard: state.activeCard ? updateItemInCard(state.activeCard) : null,
      };
    });

    await sprintService.updateChecklistItem(itemId, { title });
  },

  updateChecklistItemNotes: async (checklistId, itemId, notes) => {
    set((state) => {
      const updateItemInCard = (c: SprintCard) => ({
        ...c,
        checklists: (c.checklists || []).map((ch) =>
          ch.id === checklistId
            ? {
                ...ch,
                items: (ch.items || []).map((it) =>
                  it.id === itemId ? { ...it, notes } : it
                ),
              }
            : ch
        ),
      });

      return {
        lists: state.lists.map((l) => ({
          ...l,
          cards: l.cards.map((c) =>
            (c.checklists || []).some((ch) => ch.id === checklistId)
              ? updateItemInCard(c)
              : c
          ),
        })),
        activeCard: state.activeCard ? updateItemInCard(state.activeCard) : null,
      };
    });

    await sprintService.updateChecklistItemNotes(itemId, notes);
  },

  addChecklistItemComment: async (checklistId, itemId, cardId, content) => {
    const { supabase } = await import("@/integrations/supabase/client");
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const newComment = await sprintService.addChecklistItemComment({
      checklist_item_id: itemId,
      card_id: cardId,
      user_id: user.id,
      content,
    });

    set((state) => {
      const updateItemInCard = (c: SprintCard) => ({
        ...c,
        checklists: (c.checklists || []).map((ch) =>
          ch.id === checklistId
            ? {
                ...ch,
                items: (ch.items || []).map((it) => {
                  if (it.id !== itemId) return it;
                  const currentComments = it.comments || [];
                  return {
                    ...it,
                    comments: [...currentComments, newComment],
                    comments_count: currentComments.length + 1,
                  };
                }),
              }
            : ch
        ),
      });

      return {
        lists: state.lists.map((l) => ({
          ...l,
          cards: l.cards.map((c) =>
            (c.checklists || []).some((ch) => ch.id === checklistId)
              ? updateItemInCard(c)
              : c
          ),
        })),
        activeCard: state.activeCard ? updateItemInCard(state.activeCard) : null,
      };
    });
  },

  deleteChecklistItemComment: async (checklistId, itemId, commentId) => {
    await sprintService.deleteChecklistItemComment(commentId);

    set((state) => {
      const updateItemInCard = (c: SprintCard) => ({
        ...c,
        checklists: (c.checklists || []).map((ch) =>
          ch.id === checklistId
            ? {
                ...ch,
                items: (ch.items || []).map((it) => {
                  if (it.id !== itemId) return it;
                  const filtered = (it.comments || []).filter((c) => c.id !== commentId);
                  return {
                    ...it,
                    comments: filtered,
                    comments_count: filtered.length,
                  };
                }),
              }
            : ch
        ),
      });

      return {
        lists: state.lists.map((l) => ({
          ...l,
          cards: l.cards.map((c) =>
            (c.checklists || []).some((ch) => ch.id === checklistId)
              ? updateItemInCard(c)
              : c
          ),
        })),
        activeCard: state.activeCard ? updateItemInCard(state.activeCard) : null,
      };
    });
  },

  toggleChecklistItem: async (checklistId, itemId) => {
    let newCompleted = false;

    set((state) => {
      const updateItemInCard = (c: SprintCard) => ({
        ...c,
        checklists: (c.checklists || []).map((ch) => {
          if (ch.id !== checklistId) return ch;
          return {
            ...ch,
            items: ch.items.map((it) => {
              if (it.id === itemId) {
                newCompleted = !it.is_completed;
                return { ...it, is_completed: newCompleted };
              }
              return it;
            }),
          };
        }),
      });

      return {
        lists: state.lists.map((l) => ({ ...l, cards: l.cards.map(updateItemInCard) })),
        activeCard: state.activeCard ? updateItemInCard(state.activeCard) : null,
      };
    });

    await sprintService.updateChecklistItem(itemId, { is_completed: newCompleted });
  },

  deleteChecklistItem: async (checklistId, itemId) => {
    await sprintService.deleteChecklistItem(itemId);
    set((state) => {
      const removeItemInCard = (c: SprintCard) => ({
        ...c,
        checklists: (c.checklists || []).map((ch) => {
          if (ch.id !== checklistId) return ch;
          return { ...ch, items: ch.items.filter((it) => it.id !== itemId) };
        }),
      });

      return {
        lists: state.lists.map((l) => ({ ...l, cards: l.cards.map(removeItemInCard) })),
        activeCard: state.activeCard ? removeItemInCard(state.activeCard) : null,
      };
    });
  },

  reorderChecklists: async (cardId, newChecklists) => {
    set((state) => {
      const updateCardChecklists = (c: SprintCard) => {
        if (c.id !== cardId) return c;
        return { ...c, checklists: newChecklists };
      };

      return {
        lists: state.lists.map((l) => ({ ...l, cards: l.cards.map(updateCardChecklists) })),
        activeCard: state.activeCard?.id === cardId ? updateCardChecklists(state.activeCard) : state.activeCard,
      };
    });

    for (let i = 0; i < newChecklists.length; i++) {
      const chk = newChecklists[i];
      const position = (i + 1) * 1000;
      await sprintService.updateChecklist(chk.id, { position });
    }
  },

  reorderChecklistItems: async (checklistId, newItems) => {
    set((state) => {
      const updateItemsInCard = (c: SprintCard) => ({
        ...c,
        checklists: (c.checklists || []).map((ch) => {
          if (ch.id !== checklistId) return ch;
          return { ...ch, items: newItems };
        }),
      });

      return {
        lists: state.lists.map((l) => ({ ...l, cards: l.cards.map(updateItemsInCard) })),
        activeCard: state.activeCard ? updateItemsInCard(state.activeCard) : null,
      };
    });

    for (let i = 0; i < newItems.length; i++) {
      const item = newItems[i];
      const position = (i + 1) * 1000;
      await sprintService.updateChecklistItem(item.id, { position });
    }
  },

  moveChecklistItemBetweenChecklists: async (srcChecklistId, tgtChecklistId, srcItems, tgtItems, itemId) => {
    set((state) => {
      const updateItemsInCard = (c: SprintCard) => ({
        ...c,
        checklists: (c.checklists || []).map((ch) => {
          if (ch.id === srcChecklistId) return { ...ch, items: srcItems };
          if (ch.id === tgtChecklistId) return { ...ch, items: tgtItems };
          return ch;
        }),
      });

      return {
        lists: state.lists.map((l) => ({ ...l, cards: l.cards.map(updateItemsInCard) })),
        activeCard: state.activeCard ? updateItemsInCard(state.activeCard) : null,
      };
    });

    for (let i = 0; i < tgtItems.length; i++) {
      const it = tgtItems[i];
      const position = (i + 1) * 1000;
      if (it.id === itemId) {
        await sprintService.updateChecklistItem(it.id, { position, checklist_id: tgtChecklistId } as any);
      } else {
        await sprintService.updateChecklistItem(it.id, { position });
      }
    }
    for (let i = 0; i < srcItems.length; i++) {
      const it = srcItems[i];
      const position = (i + 1) * 1000;
      await sprintService.updateChecklistItem(it.id, { position });
    }
  },

  createLabel: async (name, color) => {
    const { currentBoard } = get();
    if (!currentBoard || !name.trim()) return null;

    try {
      const newLabel = await sprintService.createLabel({
        boardId: currentBoard.id,
        companyId: currentBoard.company_id,
        name: name.trim(),
        color,
      });

      set((state) => ({
        labels: [...state.labels, newLabel],
      }));

      toast.success(`Etiqueta "${newLabel.name}" criada com sucesso!`);
      return newLabel;
    } catch (error) {
      console.error("Erro ao criar etiqueta:", error);
      toast.error("Não foi possível criar a etiqueta.");
      return null;
    }
  },

  toggleCardLabel: async (cardId, label) => {
    const isAdded = await sprintService.toggleCardLabel(cardId, label.id);

    set((state) => {
      const updateLabels = (c: SprintCard) => {
        if (c.id !== cardId) return c;
        const currentLabels = c.labels || [];
        const newLabels = isAdded
          ? [...currentLabels, label]
          : currentLabels.filter((l) => l.id !== label.id);
        return { ...c, labels: newLabels };
      };

      return {
        lists: state.lists.map((l) => ({ ...l, cards: l.cards.map(updateLabels) })),
        activeCard: state.activeCard?.id === cardId ? updateLabels(state.activeCard) : state.activeCard,
      };
    });
  },

  toggleCardMember: async (cardId, member) => {
    const isAdded = await sprintService.toggleCardMember(cardId, member.user_id);

    set((state) => {
      const updateMembers = (c: SprintCard) => {
        if (c.id !== cardId) return c;
        const currentMembers = c.members || [];
        const newMembers = isAdded
          ? [...currentMembers, member]
          : currentMembers.filter((m) => m.user_id !== member.user_id);
        return { ...c, members: newMembers };
      };

      return {
        lists: state.lists.map((l) => ({ ...l, cards: l.cards.map(updateMembers) })),
        activeCard: state.activeCard?.id === cardId ? updateMembers(state.activeCard) : state.activeCard,
      };
    });
  },

  autoAssignMemberMention: async (cardId, member) => {
    await sprintService.addCardMember(cardId, member.user_id);
    set((state) => {
      const updateMembers = (c: SprintCard) => {
        if (c.id !== cardId) return c;
        const currentMembers = c.members || [];
        if (currentMembers.some((m) => m.user_id === member.user_id)) return c;
        return { ...c, members: [...currentMembers, member] };
      };

      return {
        lists: state.lists.map((l) => ({ ...l, cards: l.cards.map(updateMembers) })),
        activeCard: state.activeCard?.id === cardId ? updateMembers(state.activeCard) : state.activeCard,
      };
    });
  },
}));
