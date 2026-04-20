import { AcademicCapIcon, TrashIcon } from '@heroicons/react/24/outline';
import { Checkbox, Spinner } from '@material-tailwind/react';
import { useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from 'src/app/core/api/apiProvider';
import Button from 'src/app/ui/Button';
import { toast } from 'react-toastify';

interface Goal {
  id: number;
  name: string;
  status: string;
  create_date: string;
  expiration_date: string;
  content: number;
  content_name: string;
  content_type: string;
  content_theme_id: string;
  priority: string;
  user: number;
  quiz_id?: number;
  quiz_completed: boolean;
  loading?: boolean;
  score: any
}

export default function Goals() {
  const [goals, setGoals] = useState<Goal[]>([]);
  const navigate = useNavigate();

  const { data, isFetching } = useQuery({
    queryKey: ['goals'],
    queryFn: async () => {
      const { data } = await api.get(`${import.meta.env.VITE_API_URL}/goals`);
      setGoals(data);
      return data;
    },
  });

  const handleCheckboxChange = async (goal: Goal) => {
    const updatedGoal = {
      ...goal,
      status: goal.status === 'pending' ? 'done' : 'pending',
      loading: true,
    };

    let updatedGoals = goals.map((g) => (g.id === goal.id ? updatedGoal : g));

    setGoals(updatedGoals);

    await api.patch(
      `${import.meta.env.VITE_API_URL}/goals/update/${goal.id}/`,
      updatedGoal
    );

    updatedGoal.loading = false;

    updatedGoals = goals.map((g) => (g.id === goal.id ? updatedGoal : g));

    setGoals(updatedGoals);
  };

  const isOutdated = (goal: Goal) => {
    const expirationDate = new Date(goal.expiration_date);
    const currentDate = new Date();

    return expirationDate < currentDate && goal.status !== 'done';
  };

  return (
    <>
      {isFetching ? (
        <div className="flex justify-center">
          <Spinner className="h-16 w-16"></Spinner>
        </div>
      ) : goals.length === 0 ? (
        <div className="border border-tertiary rounded-md my-3 p-3 flex justify-between items-center">
          <h2 className="text-base">No tienes metas asignadas</h2>
        </div>
      ) : (
        goals.map((goal: Goal) => (
          <div
            key={goal.id}
            className={`border border-tertiary rounded-md my-3 p-3 flex justify-between items-center overflow-x-auto ${
              isOutdated(goal) ? '!border-red-500 bg-red-500/10' : ''
            }`}
          >
            <h2 className="text-base max-w-md">{goal.name}</h2>

            <div className="flex gap-3 items-center">
              <Button
                outline
                onClick={() => {
                  if (goal.content_type === "quiz") {
                    localStorage.setItem('themes', goal.content_theme_id.toString());
                    localStorage.setItem('goal', goal.id.toString());
                    navigate('/diagnosticador/questionare');
                  } else {
                    navigate(`/explorer/${goal.content}`);
                  }
                }}
                disabled={goal.quiz_completed && goal.content_type === "quiz"}
              >
                Acceder
              </Button>
              <span className="border border-tertiary rounded-md p-2 text-sm bg-tertiary/70 w-28 text-center">
                {goal.expiration_date}
              </span>
              <div
                className={`hidden sm:flex items-center ${
                  goal.loading ? 'animate-pulse' : ''
                }`}
              >
                <Checkbox
                  checked={goal.status === 'done'}
                  color="deep-purple"
                  onClick={() => handleCheckboxChange(goal)}
                  id={`goal-status-${goal.id}`}
                  disabled={goal.loading || goal.content_type === "quiz"}
                />
                <label htmlFor={`goal-status-${goal.id}`} className="w-[160px]">
                  He finalizado la tarea
                </label>
              </div>
              <div className="hidden sm:block">
                <Button
                  outline
                  variant="primary"
                  className="w-44"
                  disabled={goal.status != 'done' || !goal.quiz_id || goal.score > 50}
                  onClick={() => navigate(`/quiz/${goal.content}`)}
                >
                  {goal.score < 50 ? 'Hacer evaluación' : `Finalizado: ${goal.score} puntos`}
                </Button>
              </div>
              <div className="hidden sm:block">
                <Button
                  outline
                  variant="secondary"
                  disabled={!goal.quiz_completed}
                  onClick={() => {
                      toast('Funcionalidad en desarrollo')
                    }
                  }
                >
                  <AcademicCapIcon className="h-5 w-5 mr-2" />
                  Descargar certificado
                </Button>              
              </div>
            </div>
          </div>
        ))
      )}
    </>
  );
}
