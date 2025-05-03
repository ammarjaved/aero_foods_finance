import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import TextField from '@mui/material/TextField';
import Button from '@mui/material/Button';
import Box from '@mui/material/Box';
import Alert from '@mui/material/Alert';
import Typography from '@mui/material/Typography';
import Container from '@mui/material/Container';
import Paper from '@mui/material/Paper';
import { createTheme, ThemeProvider } from '@mui/material/styles';

// Create a theme with red background and white text
const theme = createTheme({
  palette: {
    primary: {
      main: '#d32f2f', // Red color
    },
    danger: {
      main: '#d32f2f', // Red color for the button
      contrastText: '#ffffff', // White text for the button
    },
    background: {
      paper: '#d32f2f', // Red background for Paper component
    },
    text: {
      primary: '#ffffff', // White text
    },
  },
  components: {
    MuiTextField: {
      styleOverrides: {
        root: {
          '& label': {
            color: '#ffffff', // White label text
          },
          '& label.Mui-focused': {
            color: '#ffffff', // White label text when focused
          },
          '& .MuiOutlinedInput-root': {
            '& fieldset': {
              borderColor: '#ffffff', // White border
            },
            '&:hover fieldset': {
              borderColor: '#ffffff', // White border on hover
            },
            '&.Mui-focused fieldset': {
              borderColor: '#ffffff', // White border when focused
            },
            '& input': {
              color: '#ffffff', // White input text
            },
          },
        },
      },
    },
  },
});

const LoginForm = () => {
  const [user, setUser] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();

  // Check if user is already logged in
  useEffect(() => {
    const token = localStorage.getItem('token');
    if (token) {
      navigate('/dashboard');
    }
  }, [navigate]);

  const handleLogin = async (e) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);
    const formdata = new FormData();
    formdata.append('username', user);
    formdata.append('password', password);

    try {
      const response = await fetch('http://121.121.232.54:88/aero-foods/login-web.php', {
        // const response = await fetch('http://121.121.232.53:5000/login', {
        method: 'POST',
        // headers: {
        //   'Content-Type': 'application/json',
        // },
        // body: JSON.stringify({ user, password }),
        body: formdata,
      });

      const data = await response.json();
      console.log(data);
      if (data.status === 'success') {
        localStorage.setItem('token', data.Token);
        localStorage.setItem('user', user); // Store username for display
        navigate('/landing'); // Redirect to dashboard
      } else {
        setError(data.message || 'Login failed');
      }
    } catch (err) {
      setError('An error occurred. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <ThemeProvider theme={theme}>
      <Container maxWidth="sm">
        <Box sx={{ mt: 8 }}>
          <Paper elevation={3} sx={{ p: 4 }}>
            <Typography variant="h5" component="h1" gutterBottom align="center">
              Login
            </Typography>

            <Box component="form" onSubmit={handleLogin} sx={{ mt: 2 }}>
              <TextField
                fullWidth
                label="Username"
                type="text"
                value={user}
                onChange={(e) => setUser(e.target.value)}
                margin="normal"
                required
                autoComplete="username"
              />

              <TextField
                fullWidth
                label="Password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                margin="normal"
                required
                autoComplete="current-password"
              />

              {error && (
                <Alert severity="error" sx={{ mt: 2, color: '#000000' }}>
                  {error}
                </Alert>
              )}

              <Button
                type="submit"
                fullWidth
                color="danger"
                variant="contained"
                disabled={isLoading}
                sx={{ 
                  mt: 3, 
                  mb: 2,
                  backgroundColor: '#b71c1c', // Darker red for button
                  '&:hover': {
                    backgroundColor: '#7f0000', // Even darker on hover
                  },
                  color: '#ffffff', // White text
                }}
              >
                {isLoading ? 'Loading...' : 'Login'}
              </Button>
            </Box>
          </Paper>
        </Box>
      </Container>
    </ThemeProvider>
  );
};

export default LoginForm;