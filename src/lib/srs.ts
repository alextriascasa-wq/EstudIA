import type { Flashcard, LangCard } from '@/types';
import { fsrs, createEmptyCard, Rating } from 'ts-fsrs';
import { today } from './date';

const f = fsrs({});

/**
 * Grades a flashcard using the official FSRS algorithm.
 */
export function gradeWithFSRS(card: Flashcard, rating: Rating): Flashcard {
  const now = new Date();
  
  // Initialize FSRS data if it doesn't exist (migration or new card)
  let fsrsData = card.fsrsData;
  if (!fsrsData) {
    fsrsData = createEmptyCard();
  } else {
    // Deserialize Date objects (Zustand stores them as strings)
    fsrsData = {
      ...fsrsData,
      due: new Date(fsrsData.due),
      last_review: fsrsData.last_review ? new Date(fsrsData.last_review) : undefined,
    };
  }

  // FSRS scheduling
  const schedulingCards = f.repeat(fsrsData as any, now);
  const nextCard = (schedulingCards as any)[rating].card;

  if (!nextCard) return card;

  // Update card
  card.fsrsData = nextCard;
  card.nextReview = nextCard.due.toISOString().split('T')[0]!;
  card.lastSeen = now.toISOString().split('T')[0]!;
  
  // Keep legacy stats for UI
  card.hits += 1;
  if (rating === Rating.Again) {
    card.sessionHits = 0;
  } else if (rating === Rating.Easy) {
    card.sessionHits = 3; // Graduate immediately for the session
  } else {
    card.sessionHits = (card.sessionHits ?? 0) + 1;
  }
  card.strength = Math.round(nextCard.stability * 10); // Approximation for legacy UI
  
  return card;
}



/**
 * Regla del 3 + SRS for language cards (gentler curve).
 * Mirrors Pro `gradeLangCard`: interval *= 2, max 60 days, strength ±12/−8.
 */
export function gradeLangCard(card: LangCard, correct: boolean): LangCard {
  if (correct) {
    card.sessionHits = (card.sessionHits ?? 0) + 1;
    card.hits += 1;
    card.strength = Math.min(100, card.strength + 12);
    if (card.sessionHits >= 3) {
      card.interval = Math.min(60, Math.round(card.interval * 2));
      const n = new Date();
      n.setDate(n.getDate() + card.interval);
      card.nextReview = n.toISOString().split('T')[0]!;
    }
  } else {
    card.sessionHits = 0;
    card.strength = Math.max(0, card.strength - 8);
    card.interval = 1;
    card.nextReview = today();
  }
  return card;
}

/** Cards due today or earlier. */
export function filterDueFlashcards(cards: readonly Flashcard[]): Flashcard[] {
  return cards.filter((c) => !c.nextReview || c.nextReview <= today());
}

export function filterDueLangCards(cards: readonly LangCard[]): LangCard[] {
  return cards.filter((c) => !c.nextReview || c.nextReview <= today());
}
