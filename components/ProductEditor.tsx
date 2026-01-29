import React from 'react';
import { ProductData } from '../types';

interface Props {
  data: ProductData;
  onChange: (data: ProductData) => void;
}

const ProductEditor: React.FC<Props> = ({ data, onChange }) => {
  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    onChange({ ...data, [name]: name === 'stock' ? parseInt(value) || 0 : value });
  };

  // Helper to safely get/set specifications if needed, though EtalaseEditor is the primary component.
  // This component is updated to comply with the ProductData interface to prevent build errors.

  return (
    <div className="p-4 space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="text-xs text-slate-500 font-semibold mb-1 block uppercase">ID Product</label>
          <input name="id" value={data.id} onChange={handleChange} className="w-full bg-slate-900/50 border border-slate-700 rounded-lg px-3 py-2 text-sm focus:border-indigo-500 outline-none" disabled />
        </div>
        <div>
          <label className="text-xs text-slate-500 font-semibold mb-1 block uppercase">Stock</label>
          <input type="number" name="stock" value={data.stock} onChange={handleChange} className="w-full bg-slate-900/50 border border-slate-700 rounded-lg px-3 py-2 text-sm focus:border-indigo-500 outline-none" />
        </div>
      </div>
      
      <div>
        <label className="text-xs text-slate-500 font-semibold mb-1 block uppercase">Product Name</label>
        <input name="name" value={data.name} onChange={handleChange} className="w-full bg-slate-900/50 border border-slate-700 rounded-lg px-3 py-2 text-sm focus:border-indigo-500 outline-none" />
      </div>

      <div>
        <label className="text-xs text-slate-500 font-semibold mb-1 block uppercase">Price (Spoken Words)</label>
        <input name="price" value={data.price} onChange={handleChange} placeholder="e.g. Seratus ribu" className="w-full bg-slate-900/50 border border-slate-700 rounded-lg px-3 py-2 text-sm focus:border-indigo-500 outline-none" />
      </div>

      <div>
        <label className="text-xs text-slate-500 font-semibold mb-1 block uppercase">Description</label>
        <textarea name="description" value={data.description} onChange={handleChange} className="w-full bg-slate-900/50 border border-slate-700 rounded-lg px-3 py-2 text-sm focus:border-indigo-500 outline-none" rows={3} />
      </div>

       <div className="bg-slate-800/50 p-3 rounded-lg border border-slate-700/50">
          <p className="text-[10px] text-slate-400 italic">
            Note: Detailed specifications (Material, Size, etc.) should be managed via the Etalase Editor.
          </p>
       </div>
    </div>
  );
};

export default ProductEditor;