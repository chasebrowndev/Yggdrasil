import { cva, type VariantProps } from 'class-variance-authority'
import { cn } from '@/lib/utils'

const badgeVariants = cva(
  'inline-flex items-center rounded-md px-2 py-0.5 text-xs font-medium transition-colors',
  {
    variants: {
      variant: {
        default:     'bg-secondary text-secondary-foreground border border-border',
        gold:        'bg-[hsl(27_35%_85%)] text-[hsl(27_43%_26%)] border border-[hsl(27_30%_72%)]',
        recipe:      'bg-[hsl(18_30%_83%)] text-[hsl(18_45%_30%)] border border-[hsl(18_28%_70%)]',
        guide:       'bg-[hsl(88_14%_82%)] text-[hsl(88_25%_28%)] border border-[hsl(88_14%_68%)]',
        destructive: 'bg-[hsl(0_50%_88%)] text-destructive border border-[hsl(0_40%_75%)]',
      },
    },
    defaultVariants: { variant: 'default' },
  }
)

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return <div className={cn(badgeVariants({ variant }), className)} {...props} />
}

export { Badge, badgeVariants }
