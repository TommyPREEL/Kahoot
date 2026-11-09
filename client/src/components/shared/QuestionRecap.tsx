import Icon from './Icon';
import { PlayerAnswer, QuestionResultsPayload } from '../../types';

interface Props {
  results: QuestionResultsPayload;
  /** Player view only: what this player answered (undefined = no answer in time). */
  yourAnswer?: PlayerAnswer | null;
  /** Host view: bigger text for the projector. */
  large?: boolean;
}

/** Turns answer ids (or a slider number) into the texts players saw. */
function toText(results: QuestionResultsPayload, value: string | string[] | number | boolean): string {
  if (typeof value === 'number') return String(value);
  const ids = Array.isArray(value) ? value : [String(value)];
  return ids.map(id => results.answerBreakdown.find(a => a.answerId === id)?.text ?? id).join(', ');
}

export default function QuestionRecap({ results, yourAnswer, large = false }: Props) {
  const tolerance = results.sliderMeta?.tolerance;
  const correct = toText(results, results.correctAnswer) + (tolerance ? ` (±${tolerance})` : '');

  return (
    <section className={`recap${large ? ' recap-large' : ''}`} aria-label="Question recap">
      <p className="field-label">Question {results.questionIndex + 1}</p>
      <h2 className="recap-question">{results.questionText}</h2>
      <div className="recap-line is-ok">
        <Icon name="check" />
        <span className="recap-label">Answer</span>
        <span className="recap-value">{correct}</span>
      </div>
      {yourAnswer !== undefined && (
        <div className={`recap-line ${yourAnswer?.correct ? 'is-ok-soft' : 'is-bad-soft'}`}>
          <Icon name={yourAnswer?.correct ? 'check' : 'x'} />
          <span className="recap-label">You</span>
          <span className="recap-value">{yourAnswer ? toText(results, yourAnswer.answer) : 'No answer'}</span>
        </div>
      )}
    </section>
  );
}
