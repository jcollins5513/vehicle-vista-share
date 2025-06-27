
import React from 'react';
import { Calendar, Clock, User } from 'lucide-react';
import { Card } from '@/components/ui/card';

const AppointmentCalendar = () => {
  // Sample appointments - in real app, these would come from Google Calendar API
  const appointments = [
    {
      id: 1,
      time: "10:00 AM",
      client: "John Smith",
      vehicle: "Continental GT",
      type: "Test Drive"
    },
    {
      id: 2,
      time: "2:30 PM", 
      client: "Sarah Johnson",
      vehicle: "Flying Spur",
      type: "Consultation"
    },
    {
      id: 3,
      time: "4:00 PM",
      client: "Mike Davis",
      vehicle: "Bentayga",
      type: "Delivery"
    }
  ];

  return (
    <Card className="bg-white/10 backdrop-blur-sm border-white/20 p-4">
      <h3 className="text-white font-bold text-lg mb-4 flex items-center">
        <Calendar className="w-5 h-5 mr-2" />
          Today&apos;s Appointments
      </h3>
      
      <div className="space-y-3">
        {appointments.map((appointment) => (
          <div 
            key={appointment.id}
            className="bg-white/5 rounded-lg p-3 border border-white/10"
          >
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center text-white text-sm font-medium">
                <Clock className="w-3 h-3 mr-1" />
                {appointment.time}
              </div>
              <span className="text-xs text-white/60 bg-blue-600/30 px-2 py-1 rounded">
                {appointment.type}
              </span>
            </div>
            
            <div className="flex items-center text-white/80 text-sm">
              <User className="w-3 h-3 mr-1" />
              <span>{appointment.client}</span>
            </div>
            
            <div className="text-white/60 text-xs mt-1">
              {appointment.vehicle}
            </div>
          </div>
        ))}
      </div>
      
      <div className="mt-4 text-center">
        <button className="text-blue-400 hover:text-blue-300 text-sm underline">
          View Full Calendar
        </button>
      </div>
    </Card>
  );
};

export default AppointmentCalendar;
