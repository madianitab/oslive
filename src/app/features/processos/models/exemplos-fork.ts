/** Programas de exemplo do simulador de árvore de processos. */
export interface ExemploFork { id: string; nome: string; codigo: string; }

export const EXEMPLOS_FORK: ExemploFork[] = [
  {
    id: 'dois-filhos',
    nome: 'Pai com dois filhos',
    codigo: `int main() {
    int f1, f2;
    f1 = fork();

    if (f1 != 0) {
        f2 = fork();
    }

    for (int i = 0; i < 4; i++) {
        if (f1 == 0) {
            printf("Filho 1 - i: %d\\n", i);
        } else if (f2 == 0) {
            printf("Filho 2 - i: %d\\n", i);
        } else {
            printf("Pai - i: %d\\n", i);
        }
    }
}
`,
  },
  {
    id: 'quatro-forks',
    nome: 'Quatro fork() com if',
    codigo: `int main() {
    int f1, f2, f3, f4;
    f1 = fork();

    if (f1 != 0) {
        f2 = fork();
        f3 = fork();
    }

    f4 = fork();

    for (int i = 0; i < 4; i++) {
        if (f1 == 0) {
            printf("Filho 1 - i: %d\\n", i);
        } else if (f2 == 0) {
            printf("Filho 2 - i: %d\\n", i);
        } else {
            printf("Pai - i: %d\\n", i);
        }
    }
}
`,
  },
  {
    id: 'laco',
    nome: 'fork() dentro de um laço',
    codigo: `#include <stdio.h>
#include <unistd.h>

int main() {
    for (int i = 0; i < 3; i++) {
        fork();
    }
    printf("PID %d, pai %d\\n", getpid(), getppid());
    return 0;
}
`,
  },
  {
    id: 'wait',
    nome: 'wait(): o pai espera o filho',
    codigo: `#include <stdio.h>
#include <stdlib.h>
#include <unistd.h>
#include <sys/wait.h>

int main() {
    int status;
    pid_t pid = fork();

    if (pid == 0) {
        printf("Filho %d trabalhando\\n", getpid());
        exit(7);
    }

    pid_t fim = wait(&status);
    printf("Pai: o filho %d terminou com %d\\n", fim, WEXITSTATUS(status));
    return 0;
}
`,
  },
  {
    id: 'waitpid-sleep',
    nome: 'waitpid() e sleep()',
    codigo: `#include <stdio.h>
#include <stdlib.h>
#include <unistd.h>
#include <sys/wait.h>

int main() {
    pid_t f1 = fork();
    if (f1 == 0) {
        sleep(3);
        printf("Filho 1 acordou\\n");
        exit(0);
    }

    pid_t f2 = fork();
    if (f2 == 0) {
        sleep(1);
        printf("Filho 2 acordou\\n");
        exit(0);
    }

    waitpid(f1, NULL, 0);     /* espera só o filho 1 */
    printf("Pai: filho 1 terminou\\n");
    waitpid(f2, NULL, 0);
    printf("Pai: filho 2 terminou\\n");
    return 0;
}
`,
  },
  {
    id: 'orfao',
    nome: 'Processo órfão',
    codigo: `#include <stdio.h>
#include <unistd.h>

int main() {
    pid_t pid = fork();

    if (pid == 0) {
        printf("Filho: meu pai é %d\\n", getppid());
        sleep(2);
        printf("Filho: agora meu pai é %d\\n", getppid());
    } else {
        sleep(1);
        printf("Pai %d terminando\\n", getpid());
    }
    return 0;
}
`,
  },
  {
    id: 'zumbi',
    nome: 'Processo zumbi',
    codigo: `#include <stdio.h>
#include <stdlib.h>
#include <unistd.h>
#include <sys/wait.h>

int main() {
    pid_t pid = fork();

    if (pid == 0) {
        printf("Filho terminando\\n");
        exit(0);            /* vira zumbi */
    }

    sleep(3);               /* o pai demora para chamar wait */
    wait(NULL);
    printf("Pai coletou o zumbi\\n");
    return 0;
}
`,
  },
  {
    id: 'memoria',
    nome: 'Cada processo tem sua memória',
    codigo: `#include <stdio.h>
#include <unistd.h>
#include <sys/wait.h>

int x = 10;

int main() {
    pid_t pid = fork();

    if (pid == 0) {
        x = x + 5;
        printf("Filho: x = %d\\n", x);
    } else {
        wait(NULL);
        printf("Pai: x = %d\\n", x);
    }
    return 0;
}
`,
  },
];
