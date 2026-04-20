import { useState } from 'react';

export interface QuestionProps {
  id: string;
  statement: string;
  options: {
    id: string;
    text: string;
    selected?: boolean;
  }[];
}

export default function Question({
  question: q,
  index,
  handleOptionChange,
}: {
  question: QuestionProps;
  index: number;
  handleOptionChange: Function;
}) {
  const [question, setQuestion] = useState<QuestionProps>(q);

  const handleOptionClick = (optionId: string) => {
    const updatedOptions = question.options.map((option) => {
      if (option.id === optionId) {
        return { ...option, selected: true };
      }
      return { ...option, selected: false };
    });

    setQuestion({ ...question, options: updatedOptions });
    handleOptionChange({ ...question, options: updatedOptions });
  };

  return (
    <div className="mb-5">
      <h1 className="text-white text-xl font-semibold">
        {index}. {question.statement}
      </h1>
      <div className="flex flex-col gap-3 items-stretch justify-between my-3">
        {question.options.map(
          (option: { id: string; text: string; selected?: boolean }) => (
            <div key={option.id} onClick={() => handleOptionClick(option.id)}>
              <div
                className={`border border-primary-500 rounded-xl p-2 cursor-pointer h-full flex items-center
                ${option.selected ? 'bg-primary-500' : ''}`}
              >
                <span
                  className={`ml-3 transition-all rounded-full border border-white/70 ${
                    option.selected ? 'bg-white w-4 h-4 mr-2' : 'w-4 h-4 mr-2 '
                  }`}
                ></span>
                {option.text}
              </div>
            </div>
          )
        )}
      </div>
    </div>
  );
}
