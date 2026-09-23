'use client';
import {Slider} from '@/components/ui/slider';
export default function RangeField({label,value,onChange,min=0,max=100,step=1,suffix=''}:{label:string;value:number;onChange:(value:number)=>void;min?:number;max?:number;step?:number;suffix?:string}){return <label className="range-field"><span>{label}<b>{value}{suffix}</b></span><Slider aria-label={label} min={min} max={max} step={step} value={[value]} onValueChange={v=>onChange(v[0])}/></label>}
