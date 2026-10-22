import { AlertCircle, CalendarCheck2, LockKeyhole, RotateCcw, ShieldCheck, UserRound, Users } from "lucide-react";
import type { ExamStudent, PracticalCandidate } from "@/lib/platform";

function formatEligibilityDate(value: string) {
  const isoValue = value.endsWith("Z") ? value : `${value}Z`;
  return new Date(isoValue).toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

export function ExamStudentSelect({
  students,
  value,
  loading,
  error,
  onChange,
  onRetry,
  onManageStudents,
}: {
  students: ExamStudent[];
  value: string;
  loading: boolean;
  error: string;
  onChange: (studentId: string) => void;
  onRetry: () => void;
  onManageStudents: () => void;
}) {
  return (
    <fieldset className="exam-student-picker">
      <legend>JUDOCA CADASTRADO</legend>
      {loading ? (
        <div className="exam-student-status" role="status">
          <span className="exam-student-spinner" />
          <div>
            <strong>Carregando judocas</strong>
            <small>Buscando os cadastros disponíveis para sua conta.</small>
          </div>
        </div>
      ) : error ? (
        <div className="exam-student-status error" role="alert">
          <AlertCircle size={21} />
          <div>
            <strong>Não foi possível carregar os judocas</strong>
            <small>{error}</small>
          </div>
          <button type="button" className="outline" onClick={onRetry}>
            <RotateCcw size={16} /> Tentar novamente
          </button>
        </div>
      ) : students.length ? (
        <>
          <div className="exam-student-select-wrap">
            <UserRound size={19} aria-hidden="true" />
            <select
              value={value}
              onChange={(event) => onChange(event.target.value)}
              aria-label="Judoca cadastrado"
            >
              <option value="">Selecione um judoca</option>
              {students.map((student) => (
                <option key={student.id} value={student.id}>
                  {student.name}
                </option>
              ))}
            </select>
          </div>
          <small>
            {students.length} {students.length === 1 ? "judoca disponível" : "judocas disponíveis"}. Apenas judocas previamente cadastrados aparecem aqui.
          </small>
        </>
      ) : (
        <div className="exam-student-status empty" role="status">
          <Users size={22} />
          <div>
            <strong>Nenhum judoca disponível</strong>
            <small>Cadastre um judoca antes de iniciar uma avaliação.</small>
          </div>
          <button type="button" className="outline" onClick={onManageStudents}>
            Cadastrar judoca
          </button>
        </div>
      )}
    </fieldset>
  );
}

export function PracticalCandidateSelect({
  students,
  value,
  loading,
  error,
  onChange,
  onRetry,
  onManageStudents,
}: {
  students: PracticalCandidate[];
  value: string;
  loading: boolean;
  error: string;
  onChange: (studentId: string) => void;
  onRetry: () => void;
  onManageStudents: () => void;
}) {
  const eligible = students.filter(
    (student): student is PracticalCandidate & {
      eligibility: NonNullable<PracticalCandidate["eligibility"]>;
    } => student.eligibility !== null,
  );
  const waiting = students.filter((student) => student.eligibility === null);
  const selected = eligible.find((student) => student.id === value);

  return (
    <fieldset className="exam-student-picker practical-candidate-picker">
      <legend>JUDOCA HABILITADO</legend>
      {loading ? (
        <div className="exam-student-status" role="status">
          <span className="exam-student-spinner" />
          <div>
            <strong>Conferindo aprovações</strong>
            <small>Buscando a faixa autorizada de cada judoca.</small>
          </div>
        </div>
      ) : error ? (
        <div className="exam-student-status error" role="alert">
          <AlertCircle size={21} />
          <div>
            <strong>Não foi possível carregar os candidatos</strong>
            <small>{error}</small>
          </div>
          <button type="button" className="outline" onClick={onRetry}>
            <RotateCcw size={16} /> Tentar novamente
          </button>
        </div>
      ) : eligible.length ? (
        <>
          <div className="exam-student-select-wrap">
            <UserRound size={19} aria-hidden="true" />
            <select
              value={value}
              onChange={(event) => onChange(event.target.value)}
              aria-label="Judoca habilitado para avaliação prática"
            >
              <option value="">Selecione um judoca</option>
              {eligible.map((student) => (
                <option key={student.id} value={student.id}>
                  {student.name} — {student.eligibility.beltName}
                </option>
              ))}
            </select>
          </div>
          {selected && (
            <div className="practical-eligibility-card" aria-live="polite">
              <span className={`practical-belt-mark belt-${selected.eligibility.beltId}`} aria-hidden="true" />
              <div>
                <small>Graduação autorizada</small>
                <strong>{selected.eligibility.beltName}</strong>
                <span><CalendarCheck2 size={15} /> Teórico aprovado em {formatEligibilityDate(selected.eligibility.validFrom)}</span>
              </div>
              <ShieldCheck size={23} aria-label="Elegibilidade confirmada" />
            </div>
          )}
          <small>A faixa vem da aprovação teórica e não pode ser alterada pelo avaliador.</small>
        </>
      ) : (
        <div className="exam-student-status empty" role="status">
          <LockKeyhole size={22} />
          <div>
            <strong>Nenhum judoca habilitado</strong>
            <small>A avaliação prática será liberada depois da aprovação teórica.</small>
          </div>
          <button type="button" className="outline" onClick={onManageStudents}>
            Ver alunos
          </button>
        </div>
      )}

      {!loading && !error && waiting.length > 0 && (
        <details className="practical-waiting-list">
          <summary><LockKeyhole size={16} /> Judocas aguardando o teórico</summary>
          <ul>
            {waiting.map((student) => <li key={student.id}>{student.name}</li>)}
          </ul>
        </details>
      )}
    </fieldset>
  );
}
