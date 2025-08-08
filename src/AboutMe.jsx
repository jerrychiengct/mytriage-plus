import React from "react";

const AboutMe = () => {
  return (
    <div className="p-6 max-w-3xl mx-auto">
      <h1 className="text-2xl font-bold mb-4">About Me</h1>
      <p className="mb-4">
        My name is <strong>Jerry Chieng Chin Tung</strong>, an{" "}
        <strong>Assistant Medical Officer</strong> with strong interests in{" "}
        <strong>emergency medicine</strong>, <strong>pre-hospital care</strong>, and{" "}
        <strong>technology</strong>, especially <strong>generative AI</strong>.
      </p>
      <p className="mb-4">
        Besides my professional work, I actively explore the use of AI in healthcare and beyond,
        developing tools and solutions to improve efficiency and decision-making.
      </p>
      <p>
        Do support me by sharing your opinions on this tool. If you wish to contribute through
        donations, please contact me personally via my social media platforms such as Facebook:{" "}
        <a
          href="https://www.facebook.com/jerrycct/"
          target="_blank"
          rel="noopener noreferrer"
          className="text-blue-600 underline"
        >
          https://www.facebook.com/jerrycct/
        </a>
      </p>
    </div>
  );
};

export default AboutMe;
