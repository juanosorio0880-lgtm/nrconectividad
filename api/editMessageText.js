const r = await fetch(`https://api.telegram.org/bot${token}/editMessageText`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify(body)
});
```
