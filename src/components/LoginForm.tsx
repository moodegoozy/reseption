import { FormEvent, useState } from 'react';

interface LoginFormProps {
  onSubmit: (credentials: { email: string; password: string }) => Promise<void> | void;
  onRegister?: (credentials: { email: string; password: string; name: string }) => Promise<void> | void;
  isSubmitting?: boolean;
}

export default function LoginForm({ onSubmit, onRegister, isSubmitting = false }: LoginFormProps) {
  const [isRegisterMode, setIsRegisterMode] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);

    if (!email || !password) {
      setError('يرجى إدخال البريد الإلكتروني وكلمة المرور.');
      return;
    }

    if (isRegisterMode && !name) {
      setError('يرجى إدخال الاسم.');
      return;
    }

    try {
      if (isRegisterMode && onRegister) {
        await onRegister({ email, password, name });
      } else {
        await onSubmit({ email, password });
      }
    } catch (submissionError) {
      const errorMessage = submissionError instanceof Error ? submissionError.message : 'فشلت العملية.';
      if (errorMessage.includes('auth/invalid-credential') || errorMessage.includes('auth/wrong-password')) {
        setError('البريد الإلكتروني أو كلمة المرور غير صحيحة.');
      } else if (errorMessage.includes('auth/user-not-found')) {
        setError('لا يوجد حساب بهذا البريد الإلكتروني.');
      } else if (errorMessage.includes('auth/email-already-in-use')) {
        setError('هذا البريد الإلكتروني مستخدم بالفعل.');
      } else if (errorMessage.includes('auth/weak-password')) {
        setError('كلمة المرور ضعيفة. يجب أن تكون 6 أحرف على الأقل.');
      } else if (errorMessage.includes('auth/invalid-email')) {
        setError('البريد الإلكتروني غير صالح.');
      } else {
        setError(errorMessage);
      }
    }
  };

  return (
    <form className="card auth" onSubmit={handleSubmit}>
      <h2>🔐 {isRegisterMode ? 'إنشاء حساب جديد' : 'تسجيل الدخول'}</h2>
      
      {isRegisterMode && (
        <label className="field">
          <span>الاسم الكامل</span>
          <input 
            value={name} 
            onChange={(e) => setName(e.target.value)} 
            placeholder="مثال: أحمد محمد" 
          />
        </label>
      )}
      
      <label className="field">
        <span>البريد الإلكتروني</span>
        <input 
          type="email"
          value={email} 
          onChange={(e) => setEmail(e.target.value)} 
          placeholder="example@email.com"
          dir="ltr"
        />
      </label>
      
      <label className="field">
        <span>كلمة المرور</span>
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="••••••••"
        />
      </label>
      
      {error && <p className="error">{error}</p>}
      
      <button type="submit" className="primary" disabled={isSubmitting}>
        {isSubmitting ? '⏳ جاري...' : (isRegisterMode ? '📝 إنشاء الحساب' : '🚀 دخول')}
      </button>
      
      {onRegister && (
        <p className="hint" style={{ textAlign: 'center', marginTop: '1rem' }}>
          {isRegisterMode ? 'لديك حساب؟ ' : 'ليس لديك حساب؟ '}
          <button 
            type="button" 
            className="link" 
            onClick={() => {
              setIsRegisterMode(!isRegisterMode);
              setError(null);
            }}
            style={{ color: 'var(--primary)', fontWeight: 700 }}
          >
            {isRegisterMode ? 'سجل دخول' : 'أنشئ حساب'}
          </button>
        </p>
      )}
    </form>
  );
}
