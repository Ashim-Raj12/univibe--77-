import React from "react";
import { useNavigate } from "react-router-dom";
import PostForm from "../components/PostForm";

const CreatePostPage: React.FC = () => {
  const navigate = useNavigate();

  const handleNewPost = () => {
    if (window.history.length > 1) {
      navigate(-1);
    } else {
      navigate("/home");
    }
  };

  return (
    <div className="max-w-4xl mx-auto animate-fade-in-up">
      <h1 className="text-3xl font-bold text-text-heading mb-6">Create Post</h1>
      <div className="bg-card p-8 rounded-2xl shadow-soft border border-slate-200/50">
        <PostForm onNewPost={handleNewPost} />
      </div>
    </div>
  );
};

export default CreatePostPage;
