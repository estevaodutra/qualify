import {
  AuditProfileInput,
  AuditProfileOutput,
  AuditProfileInputSchema,
  AuditProfileOutputSchema,
  ToolDefinition,
} from "../../schemas";
import { scoreInstagramProfile } from "@/services/ai/instagram/profileRubric";

export const auditProfileTool: ToolDefinition<AuditProfileInput, AuditProfileOutput> = {
  name: "instagram.audit_profile",
  description:
    "Audita o perfil do Instagram com base na matriz ponderada de 12 critérios (rubric de 100 pontos): Campo de Nome com indexação SEO, Linha 1 da bio, Prova concreta, Tríade de fixados, Link único de conversão, Destaques de dúvidas, capas e fotos.",
  type: "read_only",
  permission: "ai.use_tools",
  input_schema: AuditProfileInputSchema,
  output_schema: AuditProfileOutputSchema,
  timeout: 10,
  retry_policy: { max_retries: 2, backoff: "linear" },
  handler: async (input: AuditProfileInput): Promise<AuditProfileOutput> => {
    const res = scoreInstagramProfile({
      nameField: input.name_field,
      handle: input.handle,
      bioFirstLine: input.bio_first_line,
      bioBody: input.bio_body,
      pinnedPostsCount: input.pinned_posts_count,
      hasSpecificPinnedStrategy: input.has_specific_pinned_strategy,
      linkCount: input.link_count,
      hasDirectLandingLink: input.has_direct_landing_link,
      highlightsCount: input.highlights_count,
      gridHasLegibleCovers: input.grid_has_legible_covers,
      photoQualityCloseUp: input.photo_quality_close_up,
      hasProfessionalCategoryAndContact: input.has_professional_category_and_contact,
      postedInLast7Days: input.posted_in_last_7_days,
      repliedToCommentsInFirstHour: input.replied_to_comments_in_first_hour,
      hasActiveStoriesToday: input.has_active_stories_today,
    });

    return {
      total_score: res.totalScore,
      max_score: res.maxScore,
      percentage: res.percentage,
      grade: res.grade,
      items: res.items.map((it) => ({
        id: it.id,
        title: it.title,
        points_earned: it.pointsEarned,
        max_points: it.maxPoints,
        status: it.status,
        feedback: it.feedback,
      })),
      priority_actions: res.priorityActions,
    };
  },
};
