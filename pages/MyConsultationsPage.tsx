import React from "react";

const MyConsultationsPage: React.FC = () => {
  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold text-text-heading mb-6">
        My Consultations
      </h1>
      <p className="text-text-body">
        This page will display your consultation sessions and bookings.
      </p>
      {/* TODO: Implement consultation list and management */}
    </div>
  );
};

export default MyConsultationsPage;
