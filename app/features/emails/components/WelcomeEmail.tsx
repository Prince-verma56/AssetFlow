import {
  Html, Body, Head, Heading, Text, Container, Section, Button, Tailwind
} from "@react-email/components";

export const WelcomeEmail = ({ name, role }: { name: string; role: string }) => (
  <Html>
    <Head />
    <Tailwind>
      <Body className="bg-white font-sans">
        <Container className="mx-auto py-10 px-5">
          <Section className="bg-slate-50 border border-slate-200 rounded-lg p-8">
            <Heading className="text-2xl font-bold text-slate-900">
              Welcome to FarmDirect, {name}!
            </Heading>
            <Text className="text-slate-600 text-lg">
              You&#39;ve successfully joined as a **{role}**. 
            </Text>
            <Button
              className="bg-green-600 text-white px-6 py-3 rounded-md font-bold mt-4"
              href="https://your-domain.com/dashboard"
            >
              Go to Dashboard
            </Button>
          </Section>
        </Container>
      </Body>
    </Tailwind>
  </Html>
);