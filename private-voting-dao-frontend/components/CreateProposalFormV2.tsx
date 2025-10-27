"use client";

import { useState } from "react";
import { ResultStrategy } from "@/lib/types";

type Props = {
  onSubmit: (
    title: string,
    description: string,
    options: string[],
    durationSeconds: number,
    resultStrategy: number
  ) => void;
  isLoading: boolean;
};

export function CreateProposalFormV2({ onSubmit, isLoading }: Props) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [options, setOptions] = useState<string[]>(["", ""]);
  const [durationDays, setDurationDays] = useState(7);
  const [resultStrategy, setResultStrategy] = useState(ResultStrategy.PublicOnEnd);

  const handleAddOption = () => {
    if (options.length < 10) {
      setOptions([...options, ""]);
    }
  };

  const handleRemoveOption = (index: number) => {
    if (options.length > 2) {
      setOptions(options.filter((_, i) => i !== index));
    }
  };

  const handleOptionChange = (index: number, value: string) => {
    const newOptions = [...options];
    newOptions[index] = value;
    setOptions(newOptions);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    // 验证所有选项都已填写
    const validOptions = options.filter(opt => opt.trim());
    if (validOptions.length < 2) {
      alert("请至少填写2个选项！");
      return;
    }

    const durationSeconds = durationDays * 24 * 60 * 60;
    onSubmit(title, description, validOptions, durationSeconds, resultStrategy);
    
    // Reset form
    setTitle("");
    setDescription("");
    setOptions(["", ""]);
    setDurationDays(7);
    setResultStrategy(ResultStrategy.PublicOnEnd);
  };

  return (
    <form onSubmit={handleSubmit} className="card-glass p-8 space-y-6 fade-in">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-3xl font-bold bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent">
          🗳️ 创建提案 | Create Proposal
        </h2>
      </div>

      <div className="space-y-5">
        {/* Title */}
        <div>
          <label className="block text-sm font-medium mb-2 text-gray-300">
            📝 标题 | Title
          </label>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="input-field w-full"
            placeholder="例如：是否采用新的治理方案？"
            required
            disabled={isLoading}
          />
        </div>

        {/* Description */}
        <div>
          <label className="block text-sm font-medium mb-2 text-gray-300">
            📄 描述 | Description
          </label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={4}
            className="input-field w-full resize-none"
            placeholder="详细描述提案内容..."
            required
            disabled={isLoading}
          />
        </div>

        {/* Options */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <label className="block text-sm font-medium text-gray-300">
              ✅ 投票选项 | Options ({options.length}/10)
            </label>
            <button
              type="button"
              onClick={handleAddOption}
              disabled={options.length >= 10 || isLoading}
              className="text-sm px-3 py-1 bg-blue-500/20 hover:bg-blue-500/30 text-blue-300 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              + 添加选项
            </button>
          </div>
          
          <div className="space-y-3">
            {options.map((option, index) => (
              <div key={index} className="flex items-center gap-2">
                <span className="text-gray-400 font-mono w-8">{index}:</span>
                <input
                  type="text"
                  value={option}
                  onChange={(e) => handleOptionChange(index, e.target.value)}
                  className="input-field flex-1"
                  placeholder={`选项 ${index} (例如：赞成、反对、弃权)`}
                  required
                  disabled={isLoading}
                />
                {options.length > 2 && (
                  <button
                    type="button"
                    onClick={() => handleRemoveOption(index)}
                    disabled={isLoading}
                    className="px-3 py-2 bg-red-500/20 hover:bg-red-500/30 text-red-300 rounded-lg transition-colors"
                  >
                    ✕
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Duration and Strategy */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium mb-2 text-gray-300">
              ⏱️ 投票时长 | Duration
            </label>
            <div className="relative">
              <input
                type="number"
                value={durationDays}
                onChange={(e) => setDurationDays(parseInt(e.target.value))}
                min={1}
                className="input-field w-full pr-12"
                required
                disabled={isLoading}
              />
              <span className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 text-sm">
                天
              </span>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium mb-2 text-gray-300">
              🔒 结果策略 | Result Strategy
            </label>
            <select
              value={resultStrategy}
              onChange={(e) => setResultStrategy(parseInt(e.target.value))}
              className="input-field w-full"
              disabled={isLoading}
            >
              <option value={ResultStrategy.PublicOnEnd}>📢 到期公开 | Public</option>
              <option value={ResultStrategy.PrivateToOwner}>
                👤 定向提案者 | Owner
              </option>
              <option value={ResultStrategy.PrivateToDAO}>
                🏛️ 定向DAO | DAO
              </option>
            </select>
          </div>
        </div>

        {/* Submit Button */}
        <button
          type="submit"
          disabled={isLoading}
          className="btn-primary w-full disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
        >
          {isLoading ? (
            <span className="flex items-center justify-center gap-2">
              <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
              处理中...
            </span>
          ) : (
            "🚀 创建提案 | Create"
          )}
        </button>
      </div>
    </form>
  );
}

