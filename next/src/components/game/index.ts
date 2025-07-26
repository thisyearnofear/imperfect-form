// Export game related components
export { default as Game } from './Game';
export { default as GameWrapper } from './GameWrapper';
export { default as Leaderboard } from './Leaderboard';
export { default as Medal } from './Medal';
// Unified submission component - replaces old SubmitButton
export { default as SubmitScoreWithWagmi } from './SubmitScoreWithWagmi';
// Don't export Webcam directly to prevent SSR issues with face detection
// export { default as Webcam } from './Webcam';
export { default as Welcome } from './Welcome';