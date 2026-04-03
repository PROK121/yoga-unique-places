import { useState, useEffect } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { ArrowLeft, Smartphone } from 'lucide-react';
import { toast } from 'sonner';
import { useAuth } from '../context/AuthContext';
import { formatPhoneDisplay, normalizeRuPhone } from '../lib/phone';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { InputOTP, InputOTPGroup, InputOTPSlot } from '../components/ui/input-otp';

type Step = 'phone' | 'code';

export default function PhoneAuth() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const nextRaw = searchParams.get('next');
  const nextPath =
    nextRaw && nextRaw.startsWith('/') && !nextRaw.startsWith('//') ? nextRaw : '/profile';
  const { user, ready, sendOtp, verifyOtp } = useAuth();
  const [step, setStep] = useState<Step>('phone');
  const [phoneInput, setPhoneInput] = useState('');
  const [otp, setOtp] = useState('');
  const [demoCode, setDemoCode] = useState<string | null>(null);
  const [resendIn, setResendIn] = useState(0);

  useEffect(() => {
    if (ready && user) {
      navigate(nextPath, { replace: true });
    }
  }, [ready, user, navigate, nextPath]);

  useEffect(() => {
    if (resendIn <= 0) return;
    const t = window.setInterval(() => {
      setResendIn((s) => Math.max(0, s - 1));
    }, 1000);
    return () => window.clearInterval(t);
  }, [resendIn]);

  const normalized = normalizeRuPhone(phoneInput);
  const displayPhone = normalized ? formatPhoneDisplay(normalized) : '';

  const handleSendCode = () => {
    const r = sendOtp(phoneInput);
    if (!r.ok) {
      toast.error(r.error ?? 'Ошибка');
      return;
    }
    setDemoCode(r.demoCode ?? null);
    setStep('code');
    setOtp('');
    setResendIn(60);
    toast.success('Код отправлен');
    if (r.demoCode) {
      toast.info(`Демо: код ${r.demoCode}`, { duration: 12000 });
    }
  };

  const handleVerify = () => {
    const ok = verifyOtp(phoneInput, otp);
    if (!ok) {
      toast.error('Неверный код');
      return;
    }
    toast.success('Вы зарегистрированы');
    navigate(nextPath, { replace: true });
  };

  const handleResend = () => {
    if (resendIn > 0) return;
    const r = sendOtp(phoneInput);
    if (r.ok && r.demoCode) {
      setDemoCode(r.demoCode);
      setResendIn(60);
      toast.info(`Новый код: ${r.demoCode}`, { duration: 12000 });
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-indigo-600 via-purple-600 to-indigo-800 flex flex-col">
      <div className="max-w-md mx-auto w-full flex-1 flex flex-col px-4 pt-6 pb-8">
        <div className="flex items-center gap-3 mb-8">
          <Link
            to="/"
            className="w-10 h-10 rounded-full bg-white/15 flex items-center justify-center text-white"
            aria-label="Назад"
          >
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div>
            <h1 className="text-xl font-bold text-white">Регистрация</h1>
            <p className="text-sm text-white/80">По номеру телефона</p>
          </div>
        </div>

        <div className="bg-white rounded-3xl shadow-xl p-6 flex-1 flex flex-col">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-12 h-12 rounded-2xl bg-indigo-100 flex items-center justify-center">
              <Smartphone className="w-6 h-6 text-indigo-600" />
            </div>
            <div>
              <p className="font-semibold text-gray-900">
                {step === 'phone' ? 'Ваш номер' : 'Код из SMS'}
              </p>
              <p className="text-sm text-gray-500">
                {step === 'phone'
                  ? 'Отправим код подтверждения'
                  : displayPhone}
              </p>
            </div>
          </div>

          {step === 'phone' && (
            <>
              <label className="text-sm font-medium text-gray-700 mb-2 block">
                Телефон
              </label>
              <Input
                type="tel"
                inputMode="tel"
                autoComplete="tel"
                placeholder="+7 (999) 123-45-67"
                value={phoneInput}
                onChange={(e) => setPhoneInput(e.target.value)}
                className="h-12 text-lg mb-4"
              />
              <p className="text-xs text-gray-500 mb-6">
                Российский номер: 10 цифр после +7 или начните с 8.
              </p>
              <Button
                className="w-full h-12 text-base rounded-xl"
                onClick={handleSendCode}
                disabled={!phoneInput.trim()}
              >
                Получить код
              </Button>
            </>
          )}

          {step === 'code' && (
            <>
              <label className="text-sm font-medium text-gray-700 mb-3 block">
                Введите 6 цифр
              </label>
              <div className="flex justify-center mb-4">
                <InputOTP maxLength={6} value={otp} onChange={setOtp}>
                  <InputOTPGroup className="gap-1.5">
                    {Array.from({ length: 6 }, (_, i) => (
                      <InputOTPSlot key={i} index={i} />
                    ))}
                  </InputOTPGroup>
                </InputOTP>
              </div>
              {demoCode && (
                <p className="text-center text-sm text-indigo-600 bg-indigo-50 rounded-xl py-2 px-3 mb-4">
                  Демо без SMS: <strong>{demoCode}</strong>
                </p>
              )}
              <Button
                className="w-full h-12 text-base rounded-xl mb-3"
                onClick={handleVerify}
                disabled={otp.replace(/\D/g, '').length !== 6}
              >
                Подтвердить
              </Button>
              <button
                type="button"
                onClick={handleResend}
                disabled={resendIn > 0}
                className="w-full text-sm text-indigo-600 font-medium py-2 disabled:text-gray-400"
              >
                {resendIn > 0 ? `Отправить снова через ${resendIn} с` : 'Отправить код ещё раз'}
              </button>
              <button
                type="button"
                onClick={() => {
                  setStep('phone');
                  setOtp('');
                  setDemoCode(null);
                }}
                className="w-full text-sm text-gray-500 mt-2"
              >
                Изменить номер
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
