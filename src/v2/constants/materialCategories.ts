export interface MaterialCategory { id:number; name:string; color:string; symbol:string; }
export const MATERIAL_CATEGORIES: MaterialCategory[] = [
  { id:0,  name:"Unknown",                color:"text-slate-500",  symbol:"❓" },
  { id:1,  name:"Metals",                 color:"text-slate-300",  symbol:"🔩" },
  { id:2,  name:"Construction Materials", color:"text-orange-500", symbol:"🏗️" },
  { id:3,  name:"Agriculture",            color:"text-green-500",  symbol:"🌾" },
  { id:4,  name:"Minerals",               color:"text-amber-600",  symbol:"⛏️" },
  { id:5,  name:"Gases & Liquids",        color:"text-cyan-400",   symbol:"💧" },
  { id:6,  name:"Materials",              color:"text-gray-400",   symbol:"📦" },
  { id:7,  name:"Consumables",            color:"text-purple-400", symbol:"🍽️" },
  { id:8,  name:"Plastics",               color:"text-yellow-400", symbol:"🧪" },
  { id:9,  name:"Chemicals",              color:"text-lime-500",   symbol:"⚗️" },
  { id:10, name:"Machinery",              color:"text-red-500",    symbol:"⚙️" },
  { id:11, name:"Electronics",            color:"text-blue-400",   symbol:"⚡" },
  { id:12, name:"Science",                color:"text-pink-400",   symbol:"🔬" },
  { id:13, name:"Ship Parts",             color:"text-indigo-400", symbol:"🚀" },
  { id:14, name:"Mission Deliveries",     color:"text-blue-300", symbol:"" },
];
export const getCategoryByType = (type?:number) =>
  MATERIAL_CATEGORIES.find(c => c.id === type) ?? MATERIAL_CATEGORIES[0];
