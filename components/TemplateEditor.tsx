
import React from 'react';
import { AnswerTemplates } from '../types';

interface Props {
  data: AnswerTemplates;
  onChange: (data: AnswerTemplates) => void;
}

const TemplateEditor: React.FC<Props> = ({ data, onChange }) => {
  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    onChange({ ...data, [name]: value });
  };

  return (
    <div className="p-4 space-y-4 overflow-y-auto flex-1">
      <div className="space-y-4">
        {Object.entries(data).map(([key, value]) => (
          <div key={key} className="space-y-1.5">
            <label className="text-[10px] text-slate-500 font-black mb-1 block uppercase tracking-tighter">
              {key === 'fallback' ? 'Strict Fallback Message' : `${key} format`}
            </label>
            <textarea 
              name={key} 
              value={value} 
              onChange={handleChange}
              rows={2}
              className="w-full bg-slate-800/40 border border-slate-700/50 rounded-xl px-3 py-2 text-xs focus:border-emerald-500 outline-none resize-none text-slate-300 font-mono"
            />
          </div>
        ))}
      </div>
      <div className="bg-emerald-500/5 border border-emerald-500/20 p-3 rounded-xl mt-2">
         <p className="text-[9px] text-emerald-400 leading-relaxed font-medium">
          Note: Engine will strip generic promo fillers automatically to maintain logic integrity.
        </p>
      </div>
    </div>
  );
};

export default TemplateEditor;
