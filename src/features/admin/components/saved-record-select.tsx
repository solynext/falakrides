type Option={value:string;label:string;disabled?:boolean};
export default function SavedRecordSelect({value,options,onChange,placeholder="Select",required=false,disabled=false,id}:{value:string;options:Option[];onChange:(value:string)=>void;placeholder?:string;required?:boolean;disabled?:boolean;id?:string}) {
  return <select id={id} value={value} required={required} disabled={disabled} onChange={event=>onChange(event.target.value)}>
    <option value="" disabled={required}>{placeholder}</option>
    {value && !options.some(option=>option.value===value) && <option value={value} disabled>{value} (unavailable)</option>}
    {options.map(option=><option key={option.value} value={option.value} disabled={option.disabled}>{option.label}</option>)}
  </select>;
}
