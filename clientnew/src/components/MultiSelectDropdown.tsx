import React, { useState, useRef, useEffect } from "react";
import { Check, ChevronDown, X } from "lucide-react";

interface MultiSelectDropdownProps {
  options: string[];
  selectedValues: string[];
  onChange: (selected: string[]) => void;
  placeholder?: string;
  className?: string;
}

export const MultiSelectDropdown: React.FC<MultiSelectDropdownProps> = ({
  options,
  selectedValues = [],
  onChange,
  placeholder = "Select options",
  className = "",
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const toggleOption = (option: string) => {
    if (selectedValues.includes(option)) {
      onChange(selectedValues.filter((v) => v !== option));
    } else {
      onChange([...selectedValues, option]);
    }
  };

  const removeOption = (option: string, e: React.MouseEvent) => {
    e.stopPropagation();
    onChange(selectedValues.filter((v) => v !== option));
  };

  return (
    <div className={`relative w-full ${className}`} ref={dropdownRef}>
      <div
        className="border border-gray-300 dark:border-gray-600 rounded-lg p-2 min-h-[46px] bg-white dark:bg-gray-700 flex flex-wrap items-center gap-1 cursor-pointer hover:border-blue-400 focus-within:ring-2 focus-within:ring-blue-400 transition-colors"
        onClick={() => setIsOpen(!isOpen)}
      >
        {(!selectedValues || selectedValues.length === 0) ? (
          <span className="text-gray-500 dark:text-gray-400 ml-1 flex-1">{placeholder}</span>
        ) : (
          <div className="flex flex-wrap gap-1 flex-1">
            {selectedValues.map((val) => (
              <span
                key={val}
                className="bg-blue-100 text-blue-800 text-xs font-medium px-2 py-1 rounded flex items-center gap-1 dark:bg-blue-900 dark:text-blue-100"
              >
                {val}
                <button
                  type="button"
                  onClick={(e) => removeOption(val, e)}
                  className="hover:bg-blue-200 dark:hover:bg-blue-800 rounded-full p-[2px]"
                >
                  <X className="w-3 h-3" />
                </button>
              </span>
            ))}
          </div>
        )}
        <ChevronDown className="w-4 h-4 ml-auto text-gray-500 shrink-0" />
      </div>

      {isOpen && (
        <div className="absolute z-50 w-full mt-1 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 rounded-lg shadow-lg max-h-60 overflow-y-auto">
          <ul className="py-1">
            {options.map((option) => {
              const isSelected = selectedValues.includes(option);
              return (
                <li
                  key={option}
                  className={`px-3 py-2 cursor-pointer flex items-center justify-between hover:bg-gray-100 dark:hover:bg-gray-700 ${
                    isSelected ? "bg-blue-50 dark:bg-gray-700/50" : ""
                  }`}
                  onClick={() => toggleOption(option)}
                >
                  <span className={`text-sm ${isSelected ? "font-medium text-blue-600 dark:text-blue-400" : "text-gray-700 dark:text-gray-200"}`}>
                    {option}
                  </span>
                  {isSelected && <Check className="w-4 h-4 text-blue-600 dark:text-blue-400" />}
                </li>
              );
            })}
          </ul>
        </div>
      )}
    </div>
  );
};
