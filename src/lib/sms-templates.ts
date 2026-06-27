/**
 * Typed SMS templates (E1 step 4, E7). Every message stays under 320 chars (2
 * segments). Each template has English + Spanish; the Spanish strings are
 * machine-assisted and flagged NEEDS HUMAN REVIEW — confirm with bilingual
 * clinical staff before relying on them in production.
 */

type Locale = "en" | "es";
const PHONE = "937-579-0073";

function pick(locale: Locale, en: string, es: string): string {
  return locale === "es" ? es : en;
}

export function appointmentConfirmation(locale: Locale, firstName: string): string {
  return pick(
    locale,
    `Hi ${firstName}, we received your appointment request at Fresh Start Behavioral Health. A staff member will contact you within 1 business day. Questions? Call ${PHONE}. Reply STOP to unsubscribe.`,
    // NEEDS HUMAN REVIEW
    `Hola ${firstName}, recibimos su solicitud de cita en Fresh Start Behavioral Health. Un miembro del personal se comunicará con usted en 1 día hábil. ¿Preguntas? Llame al ${PHONE}. Responda STOP para cancelar.`,
  );
}

export function appointmentReminder(
  locale: Locale,
  firstName: string,
  locationName: string,
  time: string,
): string {
  return pick(
    locale,
    `Hi ${firstName}, reminder: your appointment at Fresh Start Behavioral Health (${locationName}) is tomorrow at ${time}. Call ${PHONE} to reschedule. Reply STOP to unsubscribe.`,
    // NEEDS HUMAN REVIEW
    `Hola ${firstName}, recordatorio: su cita en Fresh Start Behavioral Health (${locationName}) es mañana a las ${time}. Llame al ${PHONE} para reprogramar. Responda STOP para cancelar.`,
  );
}

export function portalMessageAlert(locale: Locale, portalUrl: string): string {
  return pick(
    locale,
    `You have a new message from Fresh Start Behavioral Health. Log in to your patient portal to read it: ${portalUrl}. Reply STOP to unsubscribe.`,
    // NEEDS HUMAN REVIEW
    `Tiene un nuevo mensaje de Fresh Start Behavioral Health. Inicie sesión en su portal del paciente para leerlo: ${portalUrl}. Responda STOP para cancelar.`,
  );
}

export function intakeResumeLink(locale: Locale, resumeUrl: string): string {
  return pick(
    locale,
    `Your Fresh Start intake form has been saved. Resume here: ${resumeUrl}. This link expires in 72 hours. Reply STOP to unsubscribe.`,
    // NEEDS HUMAN REVIEW
    `Su formulario de admisión de Fresh Start ha sido guardado. Continúe aquí: ${resumeUrl}. Este enlace expira en 72 horas. Responda STOP para cancelar.`,
  );
}

export function stopConfirmation(locale: Locale): string {
  return pick(
    locale,
    `You have been unsubscribed from Fresh Start Behavioral Health text messages. You will receive no further messages. Call ${PHONE} for assistance.`,
    // NEEDS HUMAN REVIEW
    `Se ha dado de baja de los mensajes de texto de Fresh Start Behavioral Health. No recibirá más mensajes. Llame al ${PHONE} para obtener ayuda.`,
  );
}

export function startConfirmation(locale: Locale): string {
  return pick(
    locale,
    `You have re-subscribed to Fresh Start Behavioral Health appointment reminders. Reply STOP at any time to unsubscribe.`,
    // NEEDS HUMAN REVIEW
    `Se ha vuelto a suscribir a los recordatorios de citas de Fresh Start Behavioral Health. Responda STOP en cualquier momento para cancelar.`,
  );
}

export function unmonitoredReply(locale: Locale): string {
  return pick(
    locale,
    `This number is for appointment reminders only and is not monitored for messages. For assistance, call ${PHONE} or visit freshstartbhinc.com.`,
    // NEEDS HUMAN REVIEW
    `Este número es solo para recordatorios de citas y no se supervisan los mensajes. Para obtener ayuda, llame al ${PHONE} o visite freshstartbhinc.com.`,
  );
}
