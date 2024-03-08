export interface Prompt {
  lines: Line[];
}

export interface Line {
  role: string;
  content: string;
}

export interface ParsedResponse {
  type: string;
  data: any;
  tokens_used: number;
}

export interface Completion {
  text: string;
  input_tokens: number;
  output_tokens: number;
}