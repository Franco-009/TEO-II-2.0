/**
 * Puertos Neutrales Reservados para IA Futura (docs/03-ARQUITECTURA.md y ADR-0002).
 * En v1 no se implementa ningún conector de IA ni se usa en el juego o corrección.
 */

export interface DocumentReference {
  documentId: string;
  storagePath: string;
  mimeType: "application/pdf";
}

export interface ExtractedDocument {
  documentId: string;
  pages: Array<{
    pageNumber: number;
    text: string;
  }>;
}

export interface QuestionGenerationRequest {
  topicId: string;
  extractedText: string;
  count: number;
}

export interface QuestionDraft {
  prompt: string;
  explanation: string;
  status: "draft";
}

export interface ExplanationRequest {
  questionId: string;
  prompt: string;
}

export interface ExplanationDraft {
  questionId: string;
  suggestedExplanation: string;
}

export interface DocumentTextExtractor {
  extract(input: DocumentReference): Promise<ExtractedDocument>;
}

export interface QuestionDraftGenerator {
  generate(input: QuestionGenerationRequest): Promise<QuestionDraft[]>;
}

export interface StudyAssistant {
  explain(input: ExplanationRequest): Promise<ExplanationDraft>;
}
