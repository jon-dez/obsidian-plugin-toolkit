import { Container } from '@obsidian-plugin-toolkit/react';
import { Button } from '@obsidian-plugin-toolkit/react/components';

export function DevelopmentModeUI({
  developmentServerUrl,
}: {
  developmentServerUrl: URL;
}) {
  return (
    <Container>
      <Button
        onClick={() => {
          window.open(new URL('/', developmentServerUrl));
        }}
      >
        Dev Menu
      </Button>
    </Container>
  );
}
