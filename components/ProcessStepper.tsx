
import React from 'react';
import { ProcessStep } from '../types';
import { ArrowRightIcon } from './icons/ArrowRightIcon';
import { CheckIcon } from './icons/CheckIcon';

interface ProcessStepperProps {
  steps: ProcessStep[];
  currentStepIndex: number;
}

const ProcessStepper: React.FC<ProcessStepperProps> = ({ steps, currentStepIndex }) => {
  return (
    <div className="flex items-center justify-center space-x-2 md:space-x-4">
      {steps.map((step, index) => {
        const isCompleted = index < currentStepIndex;
        const isActive = index === currentStepIndex;

        return (
          <React.Fragment key={step.name}>
            <div className="flex flex-col items-center space-y-2">
              <div
                className={`flex items-center justify-center w-12 h-12 md:w-16 md:h-16 rounded-lg transition-all duration-300
                  ${isActive ? 'bg-blue-600 text-white shadow-lg scale-110' : ''}
                  ${isCompleted ? 'bg-green-500 text-white' : ''}
                  ${!isActive && !isCompleted ? 'bg-slate-200 text-slate-500' : ''}
                `}
              >
                {isCompleted ? <CheckIcon className="w-8 h-8" /> : <span>{index + 1}</span>}
              </div>
              <p className={`text-xs md:text-sm text-center font-medium
                ${isActive ? 'text-blue-600' : ''}
                ${isCompleted ? 'text-green-600' : ''}
                ${!isActive && !isCompleted ? 'text-slate-500' : ''}
              `}>
                {step.name}
              </p>
            </div>
            {index < steps.length - 1 && (
              <div className="self-start mt-4 md:mt-6">
                 <ArrowRightIcon className={`w-6 h-6 md:w-8 md:h-8 transition-colors duration-300 ${isCompleted ? 'text-yellow-500' : 'text-slate-300'}`} />
              </div>
            )}
          </React.Fragment>
        );
      })}
    </div>
  );
};

export default ProcessStepper;
