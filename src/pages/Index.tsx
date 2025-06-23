
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Car, Users, Calendar } from 'lucide-react';

const Index = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-slate-800 flex items-center justify-center p-4">
      <div className="max-w-4xl mx-auto text-center">
        <div className="mb-8">
          <h1 className="text-5xl font-bold text-white mb-4">
            Bentley Supercenter
          </h1>
          <p className="text-xl text-white/80">
            Professional Showroom Display & Customer Sharing System
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
          <Card className="bg-white/10 backdrop-blur-sm border-white/20 p-8 hover:bg-white/15 transition-colors">
            <Car className="w-12 h-12 text-blue-400 mx-auto mb-4" />
            <h3 className="text-white text-xl font-bold mb-2">Showroom View</h3>
            <p className="text-white/70 mb-4">
              Full dealership display with inventory management, media control, and customer sharing tools.
            </p>
            <Button 
              onClick={() => navigate('/showroom')}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white"
            >
              Enter Showroom
            </Button>
          </Card>

          <Card className="bg-white/10 backdrop-blur-sm border-white/20 p-8 hover:bg-white/15 transition-colors">
            <Users className="w-12 h-12 text-green-400 mx-auto mb-4" />
            <h3 className="text-white text-xl font-bold mb-2">Customer View</h3>
            <p className="text-white/70 mb-4">
              Secure customer experience with vehicle details, booking, and limited access to inventory.
            </p>
            <Button 
              onClick={() => navigate('/customer/1')}
              className="w-full bg-green-600 hover:bg-green-700 text-white"
            >
              View Sample Customer Page
            </Button>
          </Card>
        </div>

        <div className="bg-white/5 backdrop-blur-sm rounded-lg p-6 border border-white/10">
          <div className="flex items-center justify-center mb-4">
            <Calendar className="w-6 h-6 text-white/60 mr-2" />
            <span className="text-white/60">Ready for Integration</span>
          </div>
          <p className="text-white/60 text-sm">
            This system is designed to integrate with Google Calendar for appointments, 
            Facebook for social sharing, and your Neon PostgreSQL database for vehicle inventory.
          </p>
        </div>
      </div>
    </div>
  );
};

export default Index;
