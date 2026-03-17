import { z } from "zod";

const stripHtml = (str: string) => str.replace(/<[^>]*>/g, "").trim();

const noInjection = (str: string) => {
  const blocked = [
    "DROP",
    "SELECT",
    "INSERT",
    "DELETE",
    "UPDATE",
    "EXEC",
    "UNION",
    "script",
    "javascript:",
    "onclick",
    "onerror",
  ];
  return !blocked.some((word) =>
    str.toUpperCase().includes(word.toUpperCase()),
  );
};

export const BirthDetailsSchema = z.object({
  name: z
    .string()
    .min(1, "Name required")
    .max(50, "Name too long")
    .transform(stripHtml)
    .refine(noInjection, "Invalid characters"),

  date: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$|^\d{2}\/\d{2}\/\d{4}$/, "Invalid date format")
    .refine(
      (d) => {
        const normalized = d.includes("-") ? d : (() => {
          const [dd, mm, yyyy] = d.split("/");
          return `${yyyy}-${mm}-${dd}`;
        })();
        const date = new Date(normalized);
        const year = date.getFullYear();
        return year >= 1900 && date <= new Date();
      },
      "Date must be between 1900 and today",
    ),

  time: z
    .string()
    .regex(
      /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/,
      "Invalid time format",
    )
    .optional()
    .or(z.literal("")),

  city: z
    .string()
    .min(2, "City too short")
    .max(100, "City too long")
    .transform(stripHtml)
    .refine(noInjection, "Invalid characters"),

  lat: z.number().min(-90).max(90).optional(),

  lng: z.number().min(-180).max(180).optional(),
});

export const ConsultMessageSchema = z.object({
  content: z
    .string()
    .min(1, "Message required")
    .max(500, "Message too long — max 500 chars")
    .transform(stripHtml),
  role: z.enum(["user", "assistant"]),
});

export const MessagesArraySchema = z
  .array(ConsultMessageSchema)
  .max(50, "Too many messages");
