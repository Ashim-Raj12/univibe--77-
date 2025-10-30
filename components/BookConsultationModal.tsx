import React, { useState, useEffect } from "react";
import { supabase } from "../services/supabase";
import { useAuth } from "../hooks/useAuth";
import Spinner from "./Spinner";

interface BookConsultationModalProps {
  facultyId: string;
  facultyName: string;
  consultationRate: number;
  consultationDuration: number;
  onClose: () => void;
  onSuccess: () => void;
}

interface TimeSlot {
  id: string;
  start_time: string;
  end_time: string;
  day_of_week: number;
  location: string;
  notes: string;
}

const BookConsultationModal: React.FC<BookConsultationModalProps> = ({
  facultyId,
  facultyName,
  consultationRate,
  consultationDuration,
  onClose,
  onSuccess,
}) => {
  const { user } = useAuth();
  const [availableSlots, setAvailableSlots] = useState<TimeSlot[]>([]);
  const [selectedSlot, setSelectedSlot] = useState<string>("");
  const [selectedDate, setSelectedDate] = useState<string>("");
  const [purpose, setPurpose] = useState("");
  const [loading, setLoading] = useState(false);
  const [fetchingSlots, setFetchingSlots] = useState(true);

  useEffect(() => {
    const fetchAvailableSlots = async () => {
      try {
        const { data, error } = await supabase
          .from("faculty_office_hours")
          .select("*")
          .eq("faculty_id", facultyId)
          .order("day_of_week", { ascending: true })
          .order("start_time", { ascending: true });

        if (error) throw error;
        setAvailableSlots(data || []);
      } catch (error) {
        console.error("Error fetching available slots:", error);
      } finally {
        setFetchingSlots(false);
      }
    };

    fetchAvailableSlots();
  }, [facultyId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedSlot || !selectedDate || !purpose.trim()) return;

    setLoading(true);
    try {
      const slot = availableSlots.find((s) => s.id === selectedSlot);
      if (!slot) return;

      const consultationDate = new Date(selectedDate);
      const dayOfWeek = consultationDate.getDay();

      // Check if the selected date matches the slot's day of week
      if (dayOfWeek !== slot.day_of_week) {
        alert(
          "Selected date does not match the available day for this time slot."
        );
        return;
      }

      const { error } = await supabase.from("consultations").insert({
        student_id: user?.id,
        faculty_id: facultyId,
        consultation_date: selectedDate,
        start_time: slot.start_time,
        end_time: slot.end_time,
        duration: consultationDuration,
        rate: consultationRate,
        purpose: purpose.trim(),
        status: "pending",
        location: slot.location,
      });

      if (error) throw error;

      onSuccess();
    } catch (error: any) {
      console.error("Error booking consultation:", error);
      alert("Failed to book consultation. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const getNextAvailableDate = (dayOfWeek: number) => {
    const today = new Date();
    const currentDay = today.getDay();
    const daysUntilTarget = (dayOfWeek - currentDay + 7) % 7;
    const targetDate = new Date(today);
    targetDate.setDate(
      today.getDate() + (daysUntilTarget === 0 ? 7 : daysUntilTarget)
    );
    return targetDate.toISOString().split("T")[0];
  };

  const daysOfWeek = [
    "Sunday",
    "Monday",
    "Tuesday",
    "Wednesday",
    "Thursday",
    "Friday",
    "Saturday",
  ];

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-full max-w-md mx-4">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-bold">Book Consultation</h2>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700"
          >
            ✕
          </button>
        </div>

        <div className="mb-4">
          <p className="text-gray-600">
            <strong>Faculty:</strong> {facultyName}
          </p>
          <p className="text-gray-600">
            <strong>Rate:</strong> ₹{consultationRate} for{" "}
            {consultationDuration} minutes
          </p>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Select Date
            </label>
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              min={new Date().toISOString().split("T")[0]}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
              required
            />
          </div>

          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Select Time Slot
            </label>
            {fetchingSlots ? (
              <div className="flex justify-center py-4">
                <Spinner />
              </div>
            ) : availableSlots.length === 0 ? (
              <p className="text-gray-500 text-sm">No available time slots</p>
            ) : (
              <select
                value={selectedSlot}
                onChange={(e) => setSelectedSlot(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
                required
              >
                <option value="">Select a time slot</option>
                {availableSlots.map((slot) => (
                  <option key={slot.id} value={slot.id}>
                    {daysOfWeek[slot.day_of_week]}: {slot.start_time} -{" "}
                    {slot.end_time}
                    {slot.location && ` (${slot.location})`}
                  </option>
                ))}
              </select>
            )}
          </div>

          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Purpose of Consultation
            </label>
            <textarea
              value={purpose}
              onChange={(e) => setPurpose(e.target.value)}
              placeholder="Describe what you'd like to discuss..."
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary resize-none"
              rows={3}
              required
            />
          </div>

          <div className="flex justify-end space-x-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-gray-600 border border-gray-300 rounded-md hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={
                loading || !selectedSlot || !selectedDate || !purpose.trim()
              }
              className="px-4 py-2 bg-primary text-white rounded-md hover:bg-primary-dark disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? "Booking..." : "Book Consultation"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default BookConsultationModal;
