import React, { useState } from 'react';
import { ProductData, ProductSpec } from '../types';
import { CATEGORY_DEFAULTS } from '../constants';
import { Plus, Trash2, Image as ImageIcon, Box, Coins, Hash, Settings2, Shirt, Smartphone, Utensils, Tag, Home, Cpu, Search, Filter, Radio, PlusCircle } from 'lucide-react';

interface Props {
  products: ProductData[];
  onChange: (products: ProductData[]) => void;
  activeProductId?: string | null;
}

const CategoryIcons: Record<string, any> = {
  'Fashion': Shirt,
  'Digital': Smartphone,
  'Electronics': Cpu,
  'Beauty': Settings2,
  'Home': Home,
  'Food': Utensils,
  'General': Tag
};

const EtalaseEditor: React.FC<Props> = ({ products, onChange, activeProductId }) => {
  const [searchTerm, setSearchTerm] = useState('');
  
  const addProduct = () => {
    const defaultCat = "General";
    const config = CATEGORY_DEFAULTS[defaultCat];
    
    const newProduct: ProductData = {
      id: `ITEM-${Date.now()}`,
      etalaseNo: (products.length + 1).toString(),
      name: "Produk Baru",
      category: defaultCat as any,
      price: "Hubungi Admin",
      stock: 0,
      description: "",
      specifications: config.specs.map(label => ({ label, value: "-" }))
    };
    onChange([...products, newProduct]);
  };

  const removeProduct = (id: string) => {
    onChange(products.filter(p => p.id !== id));
  };

  const updateProduct = (id: string, updates: Partial<ProductData>) => {
    const updatedProducts = products.map((p) => {
      if (p.id !== id) return p;
      
      let newProduct = { ...p, ...updates };

      if (updates.category && updates.category !== p.category) {
        const newConfig = CATEGORY_DEFAULTS[updates.category];
        const oldConfig = CATEGORY_DEFAULTS[p.category] || CATEGORY_DEFAULTS['General'];
        
        const newSpecs = [...p.specifications];
        newConfig.specs.forEach((label, idx) => {
          if (idx < newSpecs.length) {
            if (newSpecs[idx].label === oldConfig.specs[idx] || newSpecs[idx].label.startsWith('Fitur')) {
              newSpecs[idx] = { ...newSpecs[idx], label: label };
            }
          } else {
            newSpecs.push({ label, value: "-" });
          }
        });
        newProduct.specifications = newSpecs;
      }

      return newProduct;
    });
    onChange(updatedProducts);
  };

  const updateSpec = (id: string, index: number, field: keyof ProductSpec, value: string) => {
    const product = products.find(p => p.id === id);
    if (!product) return;
    const newSpecs = [...product.specifications];
    newSpecs[index] = { ...newSpecs[index], [field]: value };
    updateProduct(id, { specifications: newSpecs });
  };

  const addSpec = (id: string) => {
    const product = products.find(p => p.id === id);
    if (!product) return;
    updateProduct(id, { 
      specifications: [...product.specifications, { label: "Atribut Baru", value: "-" }] 
    });
  };

  const handleImageUpload = (id: string, e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        updateProduct(id, { image: reader.result as string });
      };
      reader.readAsDataURL(file);
    }
  };

  const filteredProducts = products.filter(p => 
    p.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
    p.etalaseNo.includes(searchTerm) ||
    p.category.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="flex flex-col">
      {/* Search Header - Sticky relative to parent scroll container */}
      <div className="p-4 border-b border-white/5 space-y-3 bg-slate-900/90 sticky top-0 z-20 backdrop-blur-sm">
        <div className="relative group">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-500 group-focus-within:text-emerald-500 transition-colors" />
          <input 
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search etalase or name..."
            className="w-full bg-black/40 border border-white/5 rounded-xl pl-9 pr-4 py-2 text-[11px] text-white focus:border-emerald-500/50 focus:ring-1 focus:ring-emerald-500/20 outline-none transition-all placeholder:text-slate-700 font-medium"
          />
        </div>
        
        <button 
          onClick={addProduct}
          className="w-full flex items-center justify-center gap-2 bg-emerald-500 text-slate-950 text-[10px] font-black uppercase tracking-widest py-3 rounded-xl hover:bg-emerald-400 transition-all shadow-lg shadow-emerald-500/10 active:scale-[0.98]"
        >
          <Plus className="w-3.5 h-3.5 stroke-[3px]" /> ADD NEW ETALASE
        </button>
      </div>

      <div className="p-4 space-y-4">
        {filteredProducts.length === 0 && (
          <div className="flex flex-col items-center justify-center py-12 text-slate-700 italic">
            <Filter className="w-8 h-8 mb-2 opacity-20" />
            <p className="text-[10px] font-bold uppercase tracking-widest">No products found</p>
          </div>
        )}

        {filteredProducts.map((product) => {
          const CategoryIcon = CategoryIcons[product.category] || Tag;
          const config = CATEGORY_DEFAULTS[product.category] || CATEGORY_DEFAULTS['General'];
          const isLiveActive = activeProductId === product.id;
          
          return (
            <div 
              key={product.id} 
              className={`bg-slate-900/40 border rounded-2xl p-4 space-y-4 relative group transition-all duration-500 hover:shadow-xl hover:bg-slate-900/60 ${isLiveActive ? 'border-emerald-500 ring-2 ring-emerald-500/20 shadow-emerald-500/10 bg-emerald-500/[0.03]' : 'border-white/10 shadow-white/5'}`}
            >
              {isLiveActive && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-emerald-500 text-slate-950 text-[8px] font-black uppercase px-3 py-1 rounded-full flex items-center gap-1.5 shadow-lg shadow-emerald-500/20 animate-bounce z-10">
                  <Radio className="w-2.5 h-2.5 animate-pulse" /> LIVE NOW
                </div>
              )}

              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                   <div className="flex items-center gap-1.5 bg-white/5 border border-white/10 px-2 py-1 rounded-lg">
                      <Hash className="w-2.5 h-2.5 text-slate-500" />
                      <input 
                          value={product.etalaseNo} 
                          onChange={(e) => updateProduct(product.id, { etalaseNo: e.target.value })}
                          className="w-5 bg-transparent border-none p-0 text-[10px] text-white font-black focus:ring-0 text-center"
                          placeholder="#"
                      />
                   </div>
                   <div className="flex items-center gap-1.5 px-2 py-1 bg-slate-900 rounded-lg border border-white/5 ring-1 ring-white/5">
                      <CategoryIcon className="w-3 h-3 text-slate-500" />
                      <select 
                          value={product.category}
                          onChange={(e) => updateProduct(product.id, { category: e.target.value as any })}
                          className="bg-slate-900 border-none p-0 text-[10px] font-black uppercase text-slate-300 focus:ring-0 cursor-pointer hover:text-white transition-colors outline-none"
                      >
                          <option value="Fashion">Fashion</option>
                          <option value="Electronics">Electronics</option>
                          <option value="Beauty">Beauty</option>
                          <option value="Home">Home</option>
                          <option value="Digital">Digital</option>
                          <option value="Food">Food</option>
                          <option value="General">General</option>
                      </select>
                   </div>
                </div>

                <button 
                  onClick={() => removeProduct(product.id)}
                  className="p-1.5 text-slate-700 hover:text-rose-500 transition-colors rounded-lg hover:bg-rose-500/10"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>

              <div className="flex flex-col sm:flex-row gap-4">
                <label 
                  className={`w-full sm:w-16 h-32 sm:h-16 bg-slate-950 rounded-2xl border flex flex-col items-center justify-center overflow-hidden cursor-pointer transition-all shrink-0 relative group/img ${isLiveActive ? 'border-emerald-500/50 ring-2 ring-emerald-500/10' : 'border-white/5 hover:border-emerald-500/50'}`}
                >
                  {product.image ? (
                    <img src={product.image} className="w-full h-full object-cover transition-transform group-hover/img:scale-110" />
                  ) : (
                    <ImageIcon className="w-5 h-5 text-slate-800" />
                  )}
                  <input type="file" accept="image/*" className="hidden" onChange={(e) => handleImageUpload(product.id, e)} />
                </label>

                <div className="flex-1 space-y-2.5">
                  <input 
                    value={product.name} 
                    onChange={(e) => updateProduct(product.id, { name: e.target.value })}
                    placeholder="Nama Produk..."
                    className="w-full bg-transparent border-none text-[13px] font-black text-white focus:ring-0 p-0 placeholder:text-slate-800 leading-tight"
                  />
                  
                  <div className="flex items-center gap-3">
                    <div className="flex items-center gap-1.5">
                      <Box className="w-3 h-3 text-slate-600" />
                      <input 
                        type="number"
                        value={product.stock} 
                        onChange={(e) => updateProduct(product.id, { stock: parseInt(e.target.value) || 0 })}
                        className="w-8 bg-transparent border-none p-0 text-[11px] text-slate-300 font-mono focus:ring-0 font-bold"
                      />
                    </div>
                    <div className="h-3 w-px bg-white/5"></div>
                    <div className="flex items-center gap-1.5 flex-1 min-w-0">
                      <Coins className="w-3 h-3 text-slate-600" />
                      <input 
                        value={product.price} 
                        onChange={(e) => updateProduct(product.id, { price: e.target.value })}
                        placeholder="Harga Lisan..."
                        className="w-full bg-transparent border-none p-0 text-[11px] text-emerald-500 font-mono focus:ring-0 font-bold truncate"
                      />
                    </div>
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between px-1">
                   <div className="flex items-center gap-1.5">
                      <Settings2 className="w-2.5 h-2.5 text-slate-600" />
                      <span className="text-[8px] font-black text-slate-500 uppercase tracking-widest">Atribut Produk</span>
                   </div>
                   <button 
                    onClick={() => addSpec(product.id)}
                    className="flex items-center gap-1 text-[8px] font-black text-emerald-500 uppercase hover:text-emerald-400 transition-colors"
                   >
                     <PlusCircle className="w-2.5 h-2.5" /> Tambah Atribut
                   </button>
                </div>

                <div className="grid grid-cols-1 gap-2">
                  {product.specifications.map((spec, idx) => (
                    <div key={idx} className="flex items-center gap-2 bg-black/40 border border-white/5 rounded-xl p-2 hover:border-white/10 transition-colors group/spec">
                      <div className="flex-1 grid grid-cols-2 gap-2">
                        <input 
                          value={spec.label} 
                          onChange={(e) => updateSpec(product.id, idx, 'label', e.target.value)}
                          placeholder="Label"
                          className="w-full bg-transparent border-none text-[9px] font-black text-slate-500 uppercase p-0 focus:ring-0 truncate"
                        />
                        <input 
                          value={spec.value} 
                          onChange={(e) => updateSpec(product.id, idx, 'value', e.target.value)}
                          placeholder="Value"
                          className="w-full bg-transparent border-none text-[10px] text-slate-200 p-0 focus:ring-0 font-medium truncate"
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="relative group/narration">
                <textarea 
                  value={product.description} 
                  onChange={(e) => updateProduct(product.id, { description: e.target.value })}
                  rows={2}
                  placeholder={config.placeholder}
                  className="w-full bg-black/40 border border-white/5 rounded-xl px-3 py-2 text-[10px] text-slate-400 leading-relaxed focus:border-white/20 transition-all resize-none font-medium placeholder:text-slate-800"
                />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default EtalaseEditor;