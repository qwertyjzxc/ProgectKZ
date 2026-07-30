$content = @'
"use client";

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { login } from './actions';

export default function LoginForm() {
  const router = useRouter();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const result = await login({ username, password });
      console.log('LOGIN RESULT:', result);
      if (result?.error) {
        setError(result.error);
      } else if (result?.success) {
        router.push('/');
      } else {
        setError('Unexpected response: ' + JSON.stringify(result));
      }
    } catch (err) {
      console.error('LOGIN FORM ERROR:', err);
      setError('Network error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className='space-y-4'>
      <div>
        <label className='block text-sm font-medium text-gray-700 mb-1'>Имя пользователя</label>
        <input
          type='text'
          value={username}
          onChange={e => setUsername(e.target.value)}
          required
          className='w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500'
        />
      </div>
      <div>
        <label className='block text-sm font-medium text-gray-700 mb-1'>Пароль</label>
        <input
          type='password'
          value={password}
          onChange={e => setPassword(e.target.value)}
          required
          className='w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500'
        />
      </div>
      {error && <p className='text-red-600 text-sm'>{error}</p>}
      <Button type='submit' disabled={loading} className='w-full'>
        {loading ? 'Загрузка...' : 'Войти'}
      </Button>
      <p className='mt-4 text-center text-sm text-gray-500'>
        Нет аккаунта?{' '}
        <a href='/signup' className='text-blue-600 hover:underline'>
          Зарегистрироваться
        </a>
      </p>
    </form>
  );
}
'@
Set-Content -Path 'app\login\login-form.tsx' -Value $content -Encoding UTF8