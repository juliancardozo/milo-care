import { useState, useRef, useEffect } from 'react';
import { postMiloMessage } from '../services/miloBotService';

// Saludo inicial de Milo (no se manda al backend; solo se muestra).
const GREETING = '¡Hola! Soy Milo 🐾 ¿Cómo se llama tu perro?';

const TEAL = '#0f766e';
const TEAL_DARK = '#0b5850';
const PAPER = '#faf7f0';

export default function MiloChatWidget() {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState([{ role: 'assistant', content: GREETING }]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [disabled, setDisabled] = useState(false); // true si el backend responde 503
  const scrollRef = useRef(null);
  const inputRef = useRef(null);

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [messages, loading, open]);

  useEffect(() => {
    if (open && inputRef.current) inputRef.current.focus();
  }, [open]);

  const send = async () => {
    const text = input.trim();
    if (!text || loading || disabled) return;

    const nextMessages = [...messages, { role: 'user', content: text }];
    setMessages(nextMessages);
    setInput('');
    setLoading(true);

    // El backend no necesita el saludo inicial (no es parte del historial del modelo).
    const history = nextMessages.filter((m, i) => !(i === 0 && m.content === GREETING));

    try {
      const { data } = await postMiloMessage(history);
      setMessages((prev) => [...prev, { role: 'assistant', content: data.reply }]);
    } catch (err) {
      if (err?.response?.status === 503) {
        setDisabled(true);
        setMessages((prev) => [
          ...prev,
          { role: 'assistant', content: 'Justo ahora no puedo charlar 🐾 Escribinos a hola@milocare.org y te ayudamos.' },
        ]);
      } else {
        setMessages((prev) => [
          ...prev,
          { role: 'assistant', content: 'Uy, se me cruzaron los cables 🐾 ¿Me lo repetís?' },
        ]);
      }
    } finally {
      setLoading(false);
    }
  };

  const onKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      send();
    }
  };

  return (
    <div style={{ position: 'fixed', bottom: 20, right: 20, zIndex: 1000 }}>
      {open && (
        <div
          role="dialog"
          aria-label="Chat con Milo"
          style={{
            width: 'min(360px, calc(100vw - 40px))',
            height: 'min(520px, calc(100vh - 120px))',
            display: 'flex',
            flexDirection: 'column',
            background: PAPER,
            borderRadius: 16,
            boxShadow: '0 12px 40px rgba(0,0,0,0.22)',
            overflow: 'hidden',
            marginBottom: 12,
            border: '1px solid rgba(0,0,0,0.06)',
          }}
        >
          {/* Header */}
          <div
            style={{
              background: TEAL,
              color: '#fff',
              padding: '14px 16px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span aria-hidden="true" style={{ fontSize: 20 }}>🐾</span>
              <div style={{ lineHeight: 1.15 }}>
                <div style={{ fontWeight: 700 }}>Milo</div>
                <div style={{ fontSize: 12, opacity: 0.85 }}>Asistente de Milo Care</div>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setOpen(false)}
              aria-label="Cerrar chat"
              style={{
                background: 'transparent', border: 'none', color: '#fff',
                fontSize: 22, cursor: 'pointer', lineHeight: 1, padding: 4,
              }}
            >
              ×
            </button>
          </div>

          {/* Mensajes */}
          <div ref={scrollRef} style={{ flex: 1, overflowY: 'auto', padding: 14, display: 'flex', flexDirection: 'column', gap: 10 }}>
            {messages.map((m, i) => (
              <div
                // eslint-disable-next-line react/no-array-index-key
                key={i}
                style={{
                  alignSelf: m.role === 'user' ? 'flex-end' : 'flex-start',
                  maxWidth: '85%',
                  padding: '9px 12px',
                  borderRadius: 14,
                  fontSize: 14,
                  lineHeight: 1.4,
                  whiteSpace: 'pre-wrap',
                  wordBreak: 'break-word',
                  background: m.role === 'user' ? TEAL : '#fff',
                  color: m.role === 'user' ? '#fff' : '#1f2937',
                  border: m.role === 'user' ? 'none' : '1px solid rgba(0,0,0,0.07)',
                  borderBottomRightRadius: m.role === 'user' ? 4 : 14,
                  borderBottomLeftRadius: m.role === 'user' ? 14 : 4,
                }}
              >
                {m.content}
              </div>
            ))}
            {loading && (
              <div style={{ alignSelf: 'flex-start', color: '#6b7280', fontSize: 13, fontStyle: 'italic', padding: '4px 6px' }}>
                Milo está escribiendo…
              </div>
            )}
          </div>

          {/* Input */}
          <div style={{ display: 'flex', gap: 8, padding: 12, borderTop: '1px solid rgba(0,0,0,0.07)', background: '#fff' }}>
            <input
              ref={inputRef}
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={onKeyDown}
              disabled={loading || disabled}
              placeholder={disabled ? 'No disponible por ahora' : 'Escribí tu mensaje…'}
              aria-label="Mensaje para Milo"
              style={{
                flex: 1, border: '1px solid rgba(0,0,0,0.15)', borderRadius: 20,
                padding: '9px 14px', fontSize: 14, outline: 'none',
              }}
            />
            <button
              type="button"
              onClick={send}
              disabled={loading || disabled || !input.trim()}
              aria-label="Enviar"
              style={{
                background: input.trim() && !loading && !disabled ? TEAL : '#cbd5e1',
                color: '#fff', border: 'none', borderRadius: 20,
                padding: '0 16px', fontSize: 14, fontWeight: 600,
                cursor: input.trim() && !loading && !disabled ? 'pointer' : 'default',
              }}
            >
              Enviar
            </button>
          </div>
        </div>
      )}

      {/* Botón flotante */}
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-label={open ? 'Cerrar chat con Milo' : 'Abrir chat con Milo'}
        style={{
          width: 60, height: 60, borderRadius: '50%', border: 'none',
          background: TEAL, color: '#fff', fontSize: 28, cursor: 'pointer',
          boxShadow: '0 6px 20px rgba(15,118,110,0.45)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          marginLeft: 'auto', transition: 'background 0.15s',
        }}
        onMouseEnter={(e) => { e.currentTarget.style.background = TEAL_DARK; }}
        onMouseLeave={(e) => { e.currentTarget.style.background = TEAL; }}
      >
        {open ? '×' : '🐾'}
      </button>
    </div>
  );
}
