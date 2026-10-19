export function bookingItinerary(input:{pickup:string;destination:string;date:string;time:string;dropoffDate:string;dropoffTime:string},allowMissingDropoff=false) {
  const pickup=input.pickup.trim(),destination=input.destination.trim();
  if(!pickup || !destination)throw new Error("Enter pickup and drop-off locations.");
  if(pickup.toLowerCase() === destination.toLowerCase())throw new Error("Choose different pickup and drop-off locations.");
  function dateTime(date:string,time:string,label:string) {
    const parsed = new Date(`${date}T${time}:00+03:00`);
    if(!/^\d{4}-\d{2}-\d{2}$/.test(date) || !/^([01]\d|2[0-3]):[0-5]\d$/.test(time) || Number.isNaN(parsed.getTime()) || parsed.toLocaleDateString("en-CA",{timeZone:"Asia/Riyadh"}) !== date)throw new Error(`Enter a valid ${label} date and time.`);
    return parsed;
  }
  const pickupAt=dateTime(input.date,input.time,"pickup");
  if(!input.dropoffDate && !input.dropoffTime && allowMissingDropoff)return {pickup,destination,pickupAt,dropoffDate:"",dropoffTime:""};
  const dropoffAt=dateTime(input.dropoffDate,input.dropoffTime,"drop-off");
  if(dropoffAt <= pickupAt)throw new Error("Drop-off date and time must be after pickup.");
  return {pickup,destination,pickupAt,dropoffDate:input.dropoffDate,dropoffTime:input.dropoffTime};
}
