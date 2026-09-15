import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';

/** Sends transactional email. MAIL_DRIVER=console (default) logs instead of sending. */
@Injectable()
export class MailService {
  private readonly logger = new Logger(MailService.name);
  private readonly transport?: nodemailer.Transporter;
  private readonly from: string;

  constructor(config: ConfigService) {
    this.from = config.get('MAIL_FROM') ?? 'Kovi <no-reply@kovi.app>';
    if (config.get('MAIL_DRIVER') === 'smtp') {
      const port = Number(config.get('SMTP_PORT') ?? 587);
      this.transport = nodemailer.createTransport({
        host: config.get('SMTP_HOST'),
        port,
        secure: port === 465,
        auth: { user: config.get('SMTP_USER'), pass: config.get('SMTP_PASS') },
      });
    }
  }

  async send(to: string, subject: string, text: string) {
    if (!this.transport) {
      this.logger.log(`[console mail] to=${to} subject="${subject}"\n${text}`);
      return;
    }
    await this.transport.sendMail({ from: this.from, to, subject, text });
  }

  sendPasswordResetCode(to: string, code: string) {
    return this.send(
      to,
      'Your Kovi password reset code',
      `Your password reset code is ${code}. It expires in 15 minutes.\n\nIf you did not request this, you can ignore this email.`,
    );
  }
}
