import { AlertCircle, RotateCcw, UserRound, Users } from "lucide-react";
import type { ExamStudent } from "@/lib/platform";

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
