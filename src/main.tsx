import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { createGlobalStyle, ThemeProvider } from 'styled-components';
import App from './App.tsx';

// Theme definition
const theme = {
  colors: {
    background: '#171717', // rgb(23, 23, 23);
    backgroundLight: '#1f1f1f', // rgb(31, 31, 31);
    text: {
      primary: '#e8eaed', // rgb(232, 234, 237);
      secondary: '#999999', // rgb(153, 153, 153);
      error: 'rgba(255, 0, 0, 0.1)',
      link: '#4a90e2',
    },
    chart: {
      primary: 'rgb(53, 162, 235)',
      secondary: 'rgb(53, 162, 235, 0.3)',
    },
  },
};

const GlobalStyle = createGlobalStyle`
body {
  margin: 0;
  padding: 0;
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
  background-color: ${(props) => props.theme.colors.background};
  color: ${(props) => props.theme.colors.text.primary}
}
`;

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ThemeProvider theme={theme}>
      <GlobalStyle />
      <App />
    </ThemeProvider>
  </StrictMode>
);
