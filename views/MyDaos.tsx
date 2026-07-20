import React from 'react';
import { ViewState } from '../App';
import { Compass } from 'lucide-react';
import { Button } from '../components/UI';

interface MyDaosProps {
  onViewChange: (view: ViewState) => void;
}

const MyDaos: React.FC<MyDaosProps> = ({ onViewChange }) => {
  return (
    <div className="w-full max-w-7xl mx-auto flex flex-col items-center justify-center min-h-[60vh] text-center">
      <div className="w-20 h-20 bg-primary/10 rounded-full flex items-center justify-center mb-6">
        <Compass className="w-10 h-10 text-primary" />
      </div>
      
      <h1 className="text-3xl md:text-4xl font-display font-bold text-foreground mb-4">My DAOs</h1>
      <p className="text-muted-foreground mb-8 max-w-md mx-auto text-lg">
        You haven't joined or created any DAOs yet. Explore the community to get started!
      </p>
      
      <div className="flex gap-4">
        <Button onClick={() => onViewChange('discover')} variant="primary" size="lg">
          Explore DAOs
        </Button>
        <Button onClick={() => onViewChange('create-dao')} variant="outline" size="lg">
          Create DAO
        </Button>
      </div>
    </div>
  );
};

export default MyDaos;
