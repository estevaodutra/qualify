export type StrategySectionId =
  | "overview"
  | "audience"
  | "problem_desire"
  | "promise"
  | "method"
  | "positioning"
  | "communication"
  | "profile"
  | "references"
  | "original_document"
  | "history";

export type SectionStatus = "COMPLETE" | "PARTIAL" | "EMPTY" | "NEEDS_REVIEW";

export interface BrandContext {
  whatIs?: string;
  profileObjective?: string;
  mainOffer?: string;
  currentMoment?: string;
}

export interface AudienceStrategy {
  mainAudience?: string;
  typicalClient?: string;
  currentSituation?: string;
  routine?: string;
  habits?: string;
  contentConsumption?: string;
  buyingPatterns?: string;
  triedSolutions?: string;
  whyFailed?: string;
  audienceStage?: string;
  realPhrases?: string[];
  recurringWords?: string[];
  recurringQuestions?: string[];
  emotionalTriggers?: string[];
}

export interface ProblemDesireStrategy {
  coreProblem?: string;
  secondaryProblems?: string[];
  practicalPain?: string;
  emotionalPain?: string;
  financialPain?: string;
  timePain?: string;
  identityPain?: string;
  consequences?: string;
  deepFears?: string[];
  limitingBeliefs?: string[];
  objections?: string[];
  inertiaReasons?: string;
  coreDesire?: string;
  practicalResult?: string;
  financialResult?: string;
  emotionalResult?: string;
  identityResult?: string;
  beforeAfter?: Array<{ before: string; after: string }>;
  identityTransformation?: string;
}

export interface PromiseStrategy {
  forWhom?: string;
  problem?: string;
  mechanism?: string;
  corePromise?: string;
  versions?: string[];
}

export interface MethodStep {
  stepNumber: number;
  name: string;
  objective?: string;
  whatHappens?: string;
  expectedResult?: string;
}

export interface MethodStrategy {
  name?: string;
  pointA?: string;
  pointB?: string;
  differential?: string;
  steps: MethodStep[];
}

export interface BigIdeaStrategy {
  lie?: string;
  hiddenTruth?: string;
  newWay?: string;
  finalBigIdea?: string;
}

export interface ArchetypeStrategy {
  primary?: string;
  secondary?: string;
  howItManifests?: string;
}

export interface MovementStrategy {
  unifyingIdea?: string;
  commonEnemy?: string;
  coreBelief?: string;
  mantra?: string;
}

export interface AuthorityStrategy {
  experience?: string;
  ownResults?: string;
  clientResults?: string;
  cases?: string;
  proofs?: string[];
}

export interface PositioningStrategy {
  desiredPerception?: string;
  differential?: string;
  marketGap?: string;
  transformation?: string;
  bigIdea: BigIdeaStrategy;
  archetype: ArchetypeStrategy;
  movement: MovementStrategy;
  authority: AuthorityStrategy;
}

export interface ContentPillar {
  id: string;
  name: string;
  objective?: string;
  themes: string[];
  examples?: string;
}

export interface CommunicationStrategy {
  toneOfVoice: string[]; // ex: ["Direto", "Didático", "Popular"]
  expertPersonality?: string;
  expressionsAndDialects: string[]; // chips ex: ["Pô...", "Fechou?", "Basicamente...", "É isso"]
  preferredWords: string[];
  forbiddenWords: string[];
  sentenceStyle?: string;
  formalityLevel?: string;
  humor?: string;
  priorityThemes: string[];
  forbiddenThemes: string[];
  contentPillars: ContentPillar[];
  ctas: string[];
}

export interface ProfileChecklist {
  photo: boolean;
  nameWithKeyword: boolean;
  promiseInBio: boolean;
  ctaInBio: boolean;
  correctLink: boolean;
  highlightsOrganized: boolean;
  pinnedPostsActive: boolean;
}

export interface ProfileStrategy {
  checklist: ProfileChecklist;
  displayName?: string;
  keyword?: string;
  bio?: string;
  link?: string;
  cta?: string;
  highlights: Array<{ title: string; status: "done" | "pending" }>;
  pinnedPosts: Array<{ slot: number; title: string; type: string; suggestion: string }>;
}

export interface ReferenceItem {
  handle: string;
  whatILike?: string;
  whatNotToCopy?: string;
  url?: string;
}

export interface CompetitorItem {
  name: string;
  notes?: string;
}

export interface AIRules {
  mustDo: string[];
  mustNotDo: string[];
}

export interface ReferencesStrategy {
  references: ReferenceItem[];
  competitors: CompetitorItem[];
  aiRules: AIRules;
}

export interface OfferStrategy {
  productOrService?: string;
  ticket?: string;
  deliveryFormat?: string;
  deliverables?: string;
  nextStep?: string;
  offerObjections?: string[];
}

export interface OriginalDocument {
  rawMarkdown: string;
  importedAt: string;
  source?: string;
}

export interface StrategyHistoryEntry {
  id: string;
  timestamp: string;
  title: string;
  author: string;
  description?: string;
}

export interface CriafyStrategyData {
  id?: string;
  accountId: string;
  companyId: string;
  version: string;
  brandContext: BrandContext;
  audience: AudienceStrategy;
  problemDesire: ProblemDesireStrategy;
  promise: PromiseStrategy;
  method: MethodStrategy;
  positioning: PositioningStrategy;
  communication: CommunicationStrategy;
  profile: ProfileStrategy;
  references: ReferencesStrategy;
  offer: OfferStrategy;
  strategicSummary?: string;
  originalDocument?: OriginalDocument;
  history: StrategyHistoryEntry[];
  updatedAt: string;
  createdAt: string;
}
