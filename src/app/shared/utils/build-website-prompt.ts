import { CreateProjectInput } from '../../models/project.model';

export const MAX_PROMPT_LENGTH = 5000; // server limit for /api/websites/generate and the project prompt field

export function parseServices(raw: string): string[] {
  return raw.split('\n').map((s) => s.trim()).filter(Boolean);
}

// Turns the form into the prompt sent to Gemini (through our server).
export function buildWebsitePrompt(v: CreateProjectInput): string {
  const services = parseServices(v.services ?? '');
  const free = (v.freePrompt ?? '').trim();
  const type = (v.businessType || 'business').toLowerCase();

  const lines: string[] = [free || `Create a modern ${type} website.`, ''];

  if (free && v.businessType) lines.push(`Business type: ${v.businessType}`);
  if (v.businessName?.trim()) lines.push(`Business Name: ${v.businessName.trim()}`);
  if (v.address?.trim()) lines.push(`Address: ${v.address.trim()}`);
  if (v.phone?.trim()) lines.push(`Phone: ${v.phone.trim()}`);
  if (v.email?.trim()) lines.push(`Email: ${v.email.trim()}`);
  if (services.length) lines.push('Services:', ...services.map((s) => `- ${s}`));
  if (v.theme?.trim()) lines.push('', `Theme: ${v.theme.trim()}`);
  if (v.colors?.trim()) lines.push(`Preferred colors: ${v.colors.trim()}`);
  if (v.notes?.trim()) lines.push('', `Additional requirements: ${v.notes.trim()}`);

  return lines.join('\n').trim().slice(0, MAX_PROMPT_LENGTH);
}