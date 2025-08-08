import React from 'react';

export default function AboutTool() {
  return (
    <div className="p-6 max-w-3xl mx-auto">
      <h1 className="text-2xl font-bold mb-4">About This Tool</h1>
      <p className="mb-4">
        MyTriage+ (MTS 2022) is a decision-support tool designed to assist Malaysian Assistant Medical Officers and other healthcare providers in triaging patients quickly and safely based on the Malaysian Triage Scale 2022 (Revised).
      </p>
      <p className="mb-4">
        This tool is intended to reduce the risk of undertriage and mistriaging by integrating vital sign escalation rules and a comprehensive chief complaint list tailored to Malaysia's healthcare context.
      </p>
      <p className="mb-4">
        <strong>Note:</strong> This is a decision-support tool, not a decision-making tool. Clinical judgment is always required.
      </p>
      <h2 className="text-xl font-semibold mt-6 mb-2">Collaborate with Us</h2>
      <p className="mb-4">
        You can collaborate or contribute to improving this tool by visiting our GitHub repository:
      </p>
      <a
        href="https://github.com/jerrychiengct/mytriage-plus"
        target="_blank"
        rel="noopener noreferrer"
        className="text-blue-600 underline"
      >
        https://github.com/jerrychiengct/mytriage-plus
      </a>
    </div>
  );
}
