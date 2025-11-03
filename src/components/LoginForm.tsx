import { FormEvent, useState } from 'react';

interface LoginFormProps {
  onSubmit: (credentials: { username: string; password: string }) => Promise<void> | void;
  isSubmitting?: boolean;
}

export default function LoginForm({ onSubmit, isSubmitting = false }: LoginFormProps) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);

    if (!username || !password) {
      setError('يرجى إدخال اسم المستخدم وكلمة المرور.');
      return;
    }

    try {
      await onSubmit({ username, password });
    } catch (submissionError) {
      setError(submissionError instanceof Error ? submissionError.message : 'فشل تسجيل الدخول.');
    }
  };

  return (
    <form className="card auth" onSubmit={handleSubmit}>
      <h2>تسجيل دخول الموظفين</h2>
      <label className="field">
        <span>اسم المستخدم</span>
        <input value={username} onChange={(event) => setUsername(event.target.value)} placeholder="مثال: employee1" />
      </label>
      <label className="field">
        <span>كلمة المرور</span>
        <input
          type="password"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          placeholder="••••••"
        />
      </label>
      {error ? <p className="error">{error}</p> : null}
      <button type="submit" className="primary" disabled={isSubmitting}>
        {isSubmitting ? 'جاري التحقق...' : 'تسجيل الدخول'}
      </button>
      <p className="hint">استخدم الحسابات المحددة في ملف الموظفين أو اطلب من المدير تهيئة الحسابات.</p>
    </form>
  );
}
